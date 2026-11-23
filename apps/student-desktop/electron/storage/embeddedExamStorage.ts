import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { OfflineAttemptKey, OfflineExamDraft, OfflineExamSnapshot, OfflineOperation } from "../../src/types/offlineExam";
import { examDownload, queueSlot, restoreExam } from "./offlineStorageData";

export function openEmbeddedExamStorage(file: string) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  try {
    db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS offline_exam_snapshots (
        student_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        PRIMARY KEY (student_id, session_id)
      );
      CREATE TABLE IF NOT EXISTS offline_exam_queue (
        sequence_id INTEGER PRIMARY KEY,
        student_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        slot TEXT NOT NULL,
        operation TEXT NOT NULL,
        UNIQUE (student_id, session_id, slot),
        FOREIGN KEY (student_id, session_id)
          REFERENCES offline_exam_snapshots (student_id, session_id) ON DELETE CASCADE
      );
    `);
  } catch (error) {
    db.close();
    throw error;
  }

  return {
    check() {
      // Check that this user can write to the database before an exam starts.
      db.exec("BEGIN IMMEDIATE; ROLLBACK;");
    },
    save(snapshot: OfflineExamSnapshot) {
      db.prepare(`INSERT INTO offline_exam_snapshots (student_id, session_id, snapshot)
        VALUES (?, ?, ?)
        ON CONFLICT (student_id, session_id) DO UPDATE
          SET snapshot = json_patch(offline_exam_snapshots.snapshot, excluded.snapshot)`)
        .run(snapshot.studentId, snapshot.sessionId, JSON.stringify(examDownload(snapshot)));
    },
    load(key: OfflineAttemptKey): OfflineExamSnapshot | null {
      const row = db.prepare(`SELECT s.snapshot, q.operation AS submission
        FROM offline_exam_snapshots s LEFT JOIN offline_exam_queue q
          ON q.student_id = s.student_id AND q.session_id = s.session_id AND q.slot = 'submit'
        WHERE s.student_id = ? AND s.session_id = ?`).get(key.studentId, key.sessionId);
      return row ? restoreExam(key, JSON.parse(String(row.snapshot)),
        row.submission ? JSON.parse(String(row.submission)) : undefined) : null;
    },
    saveGradingState(key: OfflineAttemptKey, protectedState: string) {
      db.prepare(`UPDATE offline_exam_snapshots SET snapshot = json_set(json_remove(snapshot, '$.gradingState'), '$.protectedGradingState', ?)
        WHERE student_id = ? AND session_id = ?`).run(protectedState, key.studentId, key.sessionId);
    },
    saveDraft(key: OfflineAttemptKey, draft: OfflineExamDraft) {
      const result = db.prepare(`UPDATE offline_exam_snapshots SET snapshot = json_set(snapshot, '$.draft', json(?))
        WHERE student_id = ? AND session_id = ?`).run(JSON.stringify(draft), key.studentId, key.sessionId);
      if (!result.changes) throw new Error("Offline exam snapshot is missing.");
    },
    enqueue(key: OfflineAttemptKey, operation: OfflineOperation) {
      db.prepare(`INSERT INTO offline_exam_queue (student_id, session_id, slot, operation) VALUES (?, ?, ?, ?)
        ON CONFLICT (student_id, session_id, slot) DO UPDATE SET operation = excluded.operation
          WHERE offline_exam_queue.slot = 'live'`)
        .run(key.studentId, key.sessionId, queueSlot(operation), JSON.stringify(operation));
    },
    list(key: OfflineAttemptKey): OfflineOperation[] {
      return db.prepare(`SELECT operation FROM offline_exam_queue WHERE student_id = ? AND session_id = ?
        ORDER BY CASE
          WHEN slot = 'submit' THEN 2
          WHEN json_extract(operation, '$.kind') = 'graded' THEN 0
          ELSE 1
        END, sequence_id LIMIT 50`).all(key.studentId, key.sessionId)
        .map((row) => JSON.parse(String(row.operation)));
    },
    acknowledge(key: OfflineAttemptKey, operation: OfflineOperation) {
      const remove = () => db.prepare(`DELETE FROM offline_exam_queue
        WHERE student_id = ? AND session_id = ? AND slot = ? AND json_extract(operation, '$.id') = ?`)
        .run(key.studentId, key.sessionId, queueSlot(operation), operation.id);
      if (operation.kind !== "submit") {
        remove();
        return;
      }

      db.exec("BEGIN IMMEDIATE");
      try {
        if (remove().changes) {
          db.prepare(`UPDATE offline_exam_snapshots
            SET snapshot = json_remove(json_set(snapshot, '$.draft', json(?)), '$.gradingState.submission')
            WHERE student_id = ? AND session_id = ?`)
            .run(JSON.stringify(operation.submission.draft), key.studentId, key.sessionId);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    updateTiming(key: OfflineAttemptKey, timing: OfflineExamSnapshot["timing"], receivedAt: number) {
      db.prepare(`UPDATE offline_exam_snapshots
        SET snapshot = json_set(snapshot, '$.timing', json(?), '$.timingReceivedAt', ?)
        WHERE student_id = ? AND session_id = ? AND json_extract(snapshot, '$.timingReceivedAt') <= ?`)
        .run(JSON.stringify(timing), receivedAt, key.studentId, key.sessionId, receivedAt);
    },
    delete(key: OfflineAttemptKey) {
      db.prepare("DELETE FROM offline_exam_snapshots WHERE student_id = ? AND session_id = ?")
        .run(key.studentId, key.sessionId);
    },
    close() {
      db.close();
    },
  };
}
