import { supabase } from "./supabaseClient"; 

// What the teacher's Student Monitoring screen needs to know about this student right now.
export interface LiveStatePayload {
  currentQuestionId: string | null; 
  currentPosition: number | null; 
  totalQuestions: number | null; 
  answeredCount: number; 
  isFocused: boolean; 
}

// Writes (or overwrites) this attempt's single live row. Returns true on success, false on any failure.
// A failure is never thrown: monitoring must never get in the way of the exam itself.
export async function reportLiveState(
  sessionId: string,
  payload: LiveStatePayload,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("session_live_state").upsert(
      {
        session_id: sessionId, 
        current_question_id: payload.currentQuestionId,
        current_position: payload.currentPosition,
        total_questions: payload.totalQuestions,
        answered_count: payload.answeredCount, 
        is_focused: payload.isFocused, 
        // last_seen_at and updated_at are set by the database trigger, never by this app
      },
      { onConflict: "session_id" },
    );
    return !error; // false when RLS refused it, the network dropped, or the session already ended
  } catch {
    return false; // network error: the next heartbeat simply tries again
  }
}