import { supabase } from "./supabaseClient";

export interface KeystrokeBatch {
  questionId: string;
  questionTitle: string | null;
  loggedAt: string;
  sequence: string;
}

const PAGE_SIZE = 500;

export async function getAttemptKeystrokes(
  sessionId: string,
  classExamId: string,
): Promise<KeystrokeBatch[]> {
  const batches: KeystrokeBatch[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("keystroke_logs")
      .select(`
        question_id, pool_draw_id, key_sequence, logged_at,
        attempt:exam_sessions!inner(class_exam_id),
        question:questions(title),
        draw:session_pool_questions(title)
      `)
      .eq("session_id", sessionId)
      .eq("attempt.class_exam_id", classExamId)
      .order("logged_at")
      .order("id")
      .range(batches.length, batches.length + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data.length) return batches;

    for (const row of data) {
      const questionId = row.question_id ?? row.pool_draw_id;
      const question = row.question_id ? row.question : row.draw;
      const details = Array.isArray(question) ? question[0] : question;
      batches.push({
        questionId,
        questionTitle: details?.title ?? null,
        loggedAt: row.logged_at,
        sequence: row.key_sequence,
      });
    }
  }
}
