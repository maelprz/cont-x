import { supabase } from "./supabaseClient";
import type { ViolationEvent } from "../types/violationEvent";

// only these values are allowed by the violation_logs CHECK constraint
type ViolationType = "alt_tab" | "windows" | "screenshot" | "copy_paste" | "disallowed_process";

// maps a raw key signal to the allowed enum value plus a readable detail
function mapViolation(event: ViolationEvent): {
  type: ViolationType;
  details: string | null;
} | null {
  switch (event.violationType) {
    case "disallowed_process":
      if (!event.process) return null;
      return {
        type: "disallowed_process",
        details: `${event.process.appName} (${event.process.executableName}) was running`,
      };
    case "alt_tab":
      return { type: "alt_tab", details: "Alt+Tab pressed" };
    case "win_key":
      return { type: "windows", details: "Windows key pressed" };
    case "ctrl_esc":
      return { type: "windows", details: "Ctrl+Escape (Start menu) pressed" };
    case "print_screen":
      return { type: "screenshot", details: "PrintScreen key pressed" };
    case "win_shift_s":
      return {
        type: "screenshot",
        details: "Win+Shift+S (Snipping Tool) pressed",
      };
    case "ctrl_c":
      return { type: "copy_paste", details: "Ctrl+C (copy) pressed" };
    case "ctrl_v":
      return { type: "copy_paste", details: "Ctrl+V (paste) pressed" };
    case "ctrl_x":
      return { type: "copy_paste", details: "Ctrl+X (cut) pressed" };
    default:
      // an unexpected value reached here — skip logging instead of crashing
      console.warn("[violationService] unrecognized violation:", event.violationType);
      return null;
  }
}

// Writes one violation row, scoped to the student's active attempt by RLS.
export async function logViolation(
  sessionId: string,
  event: ViolationEvent,
  questionId: string | null = null,
): Promise<void> {
  const mapped = mapViolation(event);
  if (!mapped) return;

  const { error } = await supabase.from("violation_logs").insert({
    session_id: sessionId,
    violation_type: mapped.type,
    details: mapped.details,
    question_id: questionId,
    logged_at: event.occurredAt,
  });

  if (error) {
    console.error("[violationService] failed to log violation:", error);
  }
}
