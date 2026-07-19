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
} | null {
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
    default:
      // an unexpected value reached here — skip logging instead of crashing
      console.warn("[violationService] unrecognized raw violation:", raw);
      return null;
  }
}

// writes one violation row, scoped to a specific exam attempt
export async function logViolation(
  sessionId: string,
  raw: RawViolation,
): Promise<void> {
  console.log("========== VIOLATION ==========");
  console.log("sessionId:", sessionId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("Logged in user:", user);

  const mapped = mapRawViolation(raw);
  if (!mapped) return; // unrecognized signal — nothing safe to log

  const { type, details } = mapped;

  console.log("sessionId:", sessionId);

  console.log("Logged in user:", user?.id);

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_id, status")
    .eq("id", sessionId)
    .single();

  console.log("Exam session from DB:", session);
  console.log("Current auth uid:", user?.id);

  const { data: sessionData, error: sessionError } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  console.log("Exam Session:", sessionData);
  console.log("Exam Session Error:", sessionError);

  console.log(
    "[violationService] current auth user:",
    user?.id ?? "NOT AUTHENTICATED",
  );

  const payload = {
    session_id: sessionId,
    violation_type: type,
    details,
  };

  console.log("Insert payload:", payload);

  const { error } = await supabase.from("violation_logs").insert(payload);

  console.log("Insert error:", error);

  if (error) {
    console.error("[violationService] failed to log violation:", error);
  }
}
