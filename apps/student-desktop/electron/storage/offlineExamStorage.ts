import { createPool, type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { OfflineAttemptKey, OfflineExamDraft, OfflineExamSnapshot, OfflineOperation } from "../../src/types/offlineExam";

const TIMEOUT_MS = 5_000;
let pool: Pool | undefined;

function getPool(): Pool | undefined {
  const user = process.env.CONTX_MYSQL_USER;
  const password = process.env.CONTX_MYSQL_PASSWORD;
  if (user === undefined && password === undefined) return undefined;
  if (!user || !password) {
    throw new Error("Set both the username and password for local exam storage.");
  }

  if (!pool) {
    const port = Number(process.env.CONTX_MYSQL_PORT ?? 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("The local MySQL port is invalid.");
    }

    pool = createPool({
      host: "127.0.0.1",
      port,
      user,
      password,
      database: process.env.CONTX_MYSQL_DATABASE ?? "contx_offline",
      connectTimeout: TIMEOUT_MS,
      connectionLimit: 2,
    });
  }
  return pool;
}

export async function checkOfflineExamStorage(): Promise<boolean> {
  const db = getPool();
  if (!db) return false;

  await db.query({
    sql: `CREATE TABLE IF NOT EXISTS offline_exam_snapshots (
      student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      snapshot JSON NOT NULL,
      PRIMARY KEY (student_id, session_id)
    ) ENGINE=InnoDB`,
    timeout: TIMEOUT_MS,
  });
  await db.query({
    sql: `CREATE TABLE IF NOT EXISTS offline_exam_queue (
      sequence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      slot VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      operation JSON NOT NULL,
      UNIQUE KEY attempt_slot (student_id, session_id, slot),
      FOREIGN KEY (student_id, session_id)
        REFERENCES offline_exam_snapshots (student_id, session_id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    timeout: TIMEOUT_MS,
  });
  return true;
}

export async function saveOfflineExam(snapshot: OfflineExamSnapshot): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is not configured.");

  // The function invocation harness is needed for visible tests after a restart.
  const questions = snapshot.questions.map(({ mainCode, ...question }) =>
    question.programType === "cFunction" ? { ...question, mainCode } : question);
  const payload = JSON.stringify({
    gradingMaterial: snapshot.gradingMaterial,
    gradingState: snapshot.gradingState,
    examId: snapshot.examId,
    title: snapshot.title,
    visibleTests: snapshot.visibleTests,
    questions,
    rules: snapshot.rules,
    timing: snapshot.timing,
    timingReceivedAt: snapshot.timingReceivedAt,
  });

  await db.execute({
    sql: `INSERT INTO offline_exam_snapshots (student_id, session_id, snapshot)
      VALUES (?, ?, ?) AS incoming
      ON DUPLICATE KEY UPDATE snapshot = JSON_SET(incoming.snapshot, '$.gradingState',
        COALESCE(JSON_EXTRACT(offline_exam_snapshots.snapshot, '$.gradingState'), JSON_OBJECT('runs', JSON_OBJECT())))`,
      ON DUPLICATE KEY UPDATE snapshot = JSON_MERGE_PATCH(offline_exam_snapshots.snapshot, incoming.snapshot)`,
    timeout: TIMEOUT_MS,
  }, [snapshot.studentId, snapshot.sessionId, payload]);
}

export async function loadOfflineExam(key: OfflineAttemptKey): Promise<OfflineExamSnapshot | null> {
  const db = getPool();
  if (!db) return null;
  const [rows] = await db.execute<RowDataPacket[]>({
    sql: `SELECT s.snapshot, q.operation AS submission
      FROM offline_exam_snapshots s LEFT JOIN offline_exam_queue q
        ON q.student_id = s.student_id AND q.session_id = s.session_id AND q.slot = 'submit'
      WHERE s.student_id = ? AND s.session_id = ?`,
    timeout: TIMEOUT_MS,
  }, [key.studentId, key.sessionId]);
  if (!rows[0]) return null;
  const snapshot = typeof rows[0].snapshot === 'string' ? JSON.parse(rows[0].snapshot) : rows[0].snapshot;
  return { ...snapshot, ...key };
}

export async function saveLocalGradingState(key: OfflineAttemptKey, state: OfflineExamSnapshot['gradingState']): Promise<void> {
  const db = getPool();
  if (!db) throw new Error('Local exam storage is not configured.');
  await db.execute({
    sql: "UPDATE offline_exam_snapshots SET snapshot = JSON_SET(snapshot, '$.gradingState', CAST(? AS JSON)) WHERE student_id = ? AND session_id = ?",
    timeout: TIMEOUT_MS,
  }, [JSON.stringify(state), key.studentId, key.sessionId]);
  const row = rows[0];
  if (!row) return null;
  const pendingSubmission = row.submission?.submission;
  return { ...row.snapshot, ...key, draft: pendingSubmission?.draft ?? row.snapshot.draft, pendingSubmission };
}

export async function saveOfflineDraft(key: OfflineAttemptKey, draft: OfflineExamDraft): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is unavailable.");
  const [result] = await db.execute<ResultSetHeader>({
    sql: `UPDATE offline_exam_snapshots SET snapshot = JSON_SET(snapshot, '$.draft', CAST(? AS JSON))
      WHERE student_id = ? AND session_id = ?`,
    timeout: TIMEOUT_MS,
  }, [JSON.stringify(draft), key.studentId, key.sessionId]);
  if (!result.affectedRows) throw new Error("Offline exam snapshot is missing.");
}

export async function enqueueOfflineOperation(key: OfflineAttemptKey, operation: OfflineOperation): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is unavailable.");
  const slot = operation.kind === "live" || operation.kind === "submit" ? operation.kind : operation.id;
  await db.execute({
    sql: `INSERT INTO offline_exam_queue (student_id, session_id, slot, operation) VALUES (?, ?, ?, ?) AS incoming
      ON DUPLICATE KEY UPDATE operation = IF(offline_exam_queue.slot = 'live', incoming.operation, offline_exam_queue.operation)`,
    timeout: TIMEOUT_MS,
  }, [key.studentId, key.sessionId, slot, JSON.stringify(operation)]);
}

export async function listOfflineOperations(key: OfflineAttemptKey): Promise<OfflineOperation[]> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is unavailable.");
  const [rows] = await db.execute<RowDataPacket[]>({
    sql: `SELECT operation FROM offline_exam_queue WHERE student_id = ? AND session_id = ?
      ORDER BY (slot = 'submit'), sequence_id LIMIT 50`,
    timeout: TIMEOUT_MS,
  }, [key.studentId, key.sessionId]);
  return rows.map((row) => row.operation);
}

export async function acknowledgeOfflineOperation(key: OfflineAttemptKey, operation: OfflineOperation): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is unavailable.");
  const slot = operation.kind === "live" || operation.kind === "submit" ? operation.kind : operation.id;
  // A confirmed deadline extension reopens the frozen draft before removing the submission.
  if (operation.kind === "submit") await saveOfflineDraft(key, operation.submission.draft);
  await db.execute({
    sql: `DELETE FROM offline_exam_queue WHERE student_id = ? AND session_id = ? AND slot = ?
      AND JSON_UNQUOTE(JSON_EXTRACT(operation, '$.id')) = ?`,
    timeout: TIMEOUT_MS,
  }, [key.studentId, key.sessionId, slot, operation.id]);
}

export async function updateOfflineTiming(
  key: OfflineAttemptKey, timing: OfflineExamSnapshot["timing"], receivedAt: number,
): Promise<void> {
  const db = getPool();
  if (!db) return;
  await db.execute({
    sql: `UPDATE offline_exam_snapshots
      SET snapshot = JSON_SET(snapshot, '$.timing', CAST(? AS JSON), '$.timingReceivedAt', CAST(? AS UNSIGNED))
      WHERE student_id = ? AND session_id = ? AND JSON_EXTRACT(snapshot, '$.timingReceivedAt') <= ?`,
    timeout: TIMEOUT_MS,
  }, [JSON.stringify(timing), receivedAt, key.studentId, key.sessionId, receivedAt]);
}

export async function deleteOfflineExam(key: OfflineAttemptKey): Promise<void> {
  await getPool()?.execute({
    sql: "DELETE FROM offline_exam_snapshots WHERE student_id = ? AND session_id = ?",
    timeout: TIMEOUT_MS,
  }, [key.studentId, key.sessionId]);
}

export function closeOfflineExamStorage(): void {
  const db = pool;
  pool = undefined;
  void db?.end().catch(() => {});
}
