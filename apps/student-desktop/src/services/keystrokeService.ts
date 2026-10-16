import { supabase } from "./supabaseClient";

export async function logKeystrokeBatch(
  sessionId: string,
  questionId: string,
  batch: string, //the compact text from the recorder
): Promise<boolean> {
  const { error } = await supabase.from("keybstroke_logs").insert({
    session_id: sessionId,
    question_id: questionId,
    key_sequence: batch,
  });

  if (error) {
    console.error("[keystrokeService] failed to save batch:", error.message); // log the reason, never the keys themselves
    return false; // tell the hook to keep this batch and retry
  }
  return true; // saved, the hook can drop it from its list
}
