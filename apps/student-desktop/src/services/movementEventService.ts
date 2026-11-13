import { supabase } from "./supabaseClient"; // same Supabase client the other services use

// the three kinds of event the student app records (the 'submitted' type is read from exam_sessions by the teacher screen instead)
export type MovementEventType = "question_navigated" | "focus_lost" | "focus_gained";

// one event waiting in the buffer
export interface BufferedMovementEvent {
  eventType: MovementEventType; // what happened
  fromQuestionId: string | null; // for navigation: the question left. For focus events: the question on screen.
  toQuestionId: string | null; // for navigation: the question arrived at. Null for focus events.
  meta: Record<string, unknown>; // small extras such as question positions (works even for pooled questions)
  at: number; // Date.now() when it happened on this computer
}

// what the caller should do next with a batch
export type InsertResult =
  | "ok" // saved, remove it from the buffer
  | "retry" // network or temporary problem, keep it and try again later
  | "drop"; // the server refused it for good (for example the attempt already ended), retrying will never work

// Saves a batch in ONE request. Never throws: monitoring must not get in the way of the exam.
export async function insertMovementEvents(
  sessionId: string,
  events: BufferedMovementEvent[],
): Promise<InsertResult> {
  const now = Date.now(); // one reading, so every row in the batch uses the same "now"
  const rows = events.map((e) => ({
    session_id: sessionId, // which attempt these belong to
    event_type: e.eventType,
    from_question_id: e.fromQuestionId,
    to_question_id: e.toQuestionId,
    // The database stamps occurred_at with the moment the row is SAVED, so late events would look wrong.
    // delay_ms says how long the event waited in the buffer. Real time = occurred_at minus delay_ms.
    meta: { ...e.meta, delay_ms: Math.max(0, now - e.at) },
  }));

  try {
    const { error } = await supabase.from("session_movement_events").insert(rows);
    if (!error) return "ok"; // saved
    // 23xxx = integrity problem, 42xxx = not allowed (RLS). The server answered "no", so retrying cannot help.
    if (error.code && (error.code.startsWith("23") || error.code.startsWith("42"))) return "drop";
    return "retry"; // anything else is treated as temporary
  } catch {
    return "retry"; // the network dropped
  }
}