import { supabase } from "./supabaseClient";

// the specific raw signal coming from the native keyboard hook
export type RawViolation =
  | "alt_tab"
  | "win_key"
  | "ctrl_esc"
  | "print_screen"
  | "win_shift_s"
  | "ctrl_c"
  | "ctrl_v"
  | "ctrl_x";

// only these values are allowed by the violation_logs CHECK constraint
type ViolationType = "alt_tab" | "windows" | "screenshot" | "copy_paste";

// maps a raw key signal to the allowed enum value plus a readable detail
function mapRawViolation(raw: RawViolation): {
  type: ViolationType;
  details: string | null;
} {
  switch (raw) {
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
  }
}

// writes one violation row, scoped to a specific exam attempt
export async function logViolation(
  sessionId: string,
  raw: RawViolation,
): Promise<void> {
  const { type, details } = mapRawViolation(raw); // convert raw signal to allowed enum

  const { error } = await supabase.from("violation_logs").insert({
    session_id: sessionId, // ties this violation to the current attempt
    violation_type: type, // must match the CHECK constraint values
    details, // human-readable specifics, nullable
  });

  if (error) {
    // logged only — a failed violation write must never interrupt the exam
    console.error("[violationService] failed to log violation:", error);
  }
}
