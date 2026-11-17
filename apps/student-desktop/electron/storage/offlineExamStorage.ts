import { createPool, type Pool } from "mysql2/promise";
import type { OfflineExamSnapshot } from "../../src/types/offlineExam";

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
  return true;
}

export async function saveOfflineExam(snapshot: OfflineExamSnapshot): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("Local exam storage is not configured.");

  // The coding harness is only needed by the current online compiler path.
  const questions = snapshot.questions.map(({ mainCode: _mainCode, ...question }) => question);
  const payload = JSON.stringify({
    questions,
    rules: snapshot.rules,
    timing: snapshot.timing,
    timingReceivedAt: snapshot.timingReceivedAt,
  });

  await db.execute({
    sql: `INSERT INTO offline_exam_snapshots (student_id, session_id, snapshot)
      VALUES (?, ?, ?) AS incoming
      ON DUPLICATE KEY UPDATE snapshot = incoming.snapshot`,
    timeout: TIMEOUT_MS,
  }, [snapshot.studentId, snapshot.sessionId, payload]);
}

export function closeOfflineExamStorage(): void {
  const db = pool;
  pool = undefined;
  void db?.end().catch(() => {});
}
