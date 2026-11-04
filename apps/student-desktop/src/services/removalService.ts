import { supabase } from "./supabaseClient";
import { useExamSessionStore } from "../stores/useExamSessionStore";

// reads only the status of one session
export async function getSessionStatus(sessionId: string): Promise<string> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(error.message);
  return data.status; // e.g. "in_progress" or "removed"
}

// true (and the removal modal opens) when the teacher removed this student; false otherwise
export async function checkIfRemoved(sessionId: string): Promise<boolean> {
  try {
    const status = await getSessionStatus(sessionId);
    if (status !== "removed") return false;
    useExamSessionStore.getState().markRemoved();
    return true; // tell the caller the student was removed
  } catch {
    return false; // network or database hiccup: treat as "unknown" and let the next check try again
  }
}
