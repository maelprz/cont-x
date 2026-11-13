import { supabase } from "./supabaseClient"; // same client the other services use
import type {
  MonitoringStatus,
  StudentMonitoringRow,
} from "../screens/studentMonitoring/studentMonitoringScreen.types";

// A student is shown as Offline after this long without an update.
// The student app reports every 20 to 25 seconds, so 90 seconds allows about 4 missed beats.
export const OFFLINE_AFTER_SECONDS = 90;

// the raw shape one roster row comes back in (snake_case, straight from the database function)
type RosterRpcRow = {
  student_id: string;
  session_id: string | null;
  id_number: string;
  first_name: string;
  last_name: string;
  attempt_number: number | null;
  session_status: "in_progress" | "submitted" | "timed_out" | "removed" | null;
  current_position: number | null;
  total_questions: number | null;
  answered_count: number | null;
  is_focused: boolean | null;
  seconds_since_seen: number | null;
  violation_count: number | string | null; // bigint can arrive as a string
};

// works out the status the teacher sees from the stored status and how recently the student reported
function deriveStatus(row: RosterRpcRow): MonitoringStatus {
  if (row.session_id === null || row.session_status === null) return "not_joined"; // no attempt exists
  if (row.session_status !== "in_progress") return row.session_status; // submitted, timed out and removed are final
  const age = row.seconds_since_seen; // measured by the database clock, not the teacher's browser
  if (age === null || age > OFFLINE_AFTER_SECONDS) return "offline"; // never reported, or silent for too long
  return "in_progress"; // running and recently heard from
}

// loads every enrolled student of ONE class exam, with their latest attempt and live state
export async function getStudentMonitoringRoster(
  classExamId: string,
): Promise<StudentMonitoringRow[]> {
  const { data, error } = await supabase.rpc("get_student_monitoring_roster", {
    p_class_exam_id: classExamId, // matches the SQL function's only parameter
  });
  if (error) throw new Error(error.message); // the hook shows this text, for example "not allowed"

  return ((data ?? []) as RosterRpcRow[]).map((row) => ({
    studentId: row.student_id,
    sessionId: row.session_id,
    studentName: `${row.last_name}, ${row.first_name}`, // same "Last, First" order the list is sorted in
    studentIdNumber: row.id_number,
    attemptNumber: row.attempt_number,
    status: deriveStatus(row),
    currentPosition: row.current_position,
    totalQuestions: row.total_questions,
    answeredCount: row.answered_count,
    isFocused: row.is_focused,
    secondsSinceSeen: row.seconds_since_seen,
    violationCount: Number(row.violation_count ?? 0), // always a plain number for display
  }));
}