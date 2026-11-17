import { supabase } from "./supabaseClient";

export type KeystrokeQuestion =
  | { questionId: string; poolDrawId?: never }
  | { questionId?: never; poolDrawId: string };

export async function logKeystrokeBatch(
  sessionId: string,
  id: string,
  question: KeystrokeQuestion,
  batch: string,
  loggedAt?: string,
): Promise<boolean> {
  const { error } = await supabase.from("keystroke_logs")
    .insert({
      id,
      session_id: sessionId,
      ...(question.poolDrawId
        ? { pool_draw_id: question.poolDrawId }
        : { question_id: question.questionId }),
      key_sequence: batch,
      ...(loggedAt ? { logged_at: loggedAt } : {}),
    })
    .abortSignal(AbortSignal.timeout(5_000));

  if (error?.code === "23505") return true; // The earlier insert committed before its response was lost.

  if (error) {
    console.error("[keystrokeService] failed to save batch:", error.message); // log the reason, never the keys themselves
    return false; // tell the hook to keep this batch and retry
  }
  return true; // saved, the hook can drop it from its list
}
