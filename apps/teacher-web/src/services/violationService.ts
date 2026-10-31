import { supabase } from "./supabaseClient";
import type {
  ViolationSessionRow,
  ViolationDetailRow,
} from "../screens/violationLogs/violationMonitoringScreen.types";

type SessionRow = {
  id: string;
  status: "in_progress" | "submitted" | "timed_out";
  joined_at: string;
  submitted_at: string | null;
  attempt_number: number;
  violation_logs: { count: number }[];
};

// one row from get_exam_session_students (teachers can't read the users table directly)
type StudentNameRow = {
  session_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapSessionRowToTableRow(
  row: SessionRow,
  student: StudentNameRow | undefined,
): ViolationSessionRow {
  return {
    id: row.id,
    studentIdNumber: student?.id_number ?? "—", // dash if no student came back for this attempt
    studentName: student
      ? `${student.first_name} ${student.last_name}` // combine into one display name
      : "Unknown Student",
    attemptNumber: row.attempt_number,
    status: row.status,
    joinedAt: formatTimestamp(row.joined_at),
    submittedAt: row.submitted_at ? formatTimestamp(row.submitted_at) : null, // null stays null
    violationCount: row.violation_logs[0]?.count ?? 0, // pull count out of embedded array
  };
}

export async function getSessionsForExam(
  examId: string,
): Promise<ViolationSessionRow[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      status,
      joined_at,
      submitted_at,
      attempt_number,
      violation_logs(count)
    `,
    )
    .eq("exam_id", examId)
    .order("joined_at", { ascending: false }); // most recent attempts first

  if (error) throw error; // let the hook decide how to show this error

  // names and ID numbers come from a function that only returns this teacher's own students
  const { data: nameData, error: nameError } = await supabase.rpc(
    "get_exam_session_students",
    { p_exam_id: examId },
  );
  if (nameError) throw nameError;
  const studentsBySession = new Map(
    ((nameData as StudentNameRow[] | null) ?? []).map((n) => [n.session_id, n]),
  );

  return (data as unknown as SessionRow[]).map((row) =>
    mapSessionRowToTableRow(row, studentsBySession.get(row.id)),
  );
}

type ViolationLogRow = {
  id: string;
  violation_type: "alt_tab" | "windows" | "screenshot" | "copy_paste";
  details: string | null;
  logged_at: string;
};

// turns a raw violation row into the shape the modal expects
function mapViolationRowToDetailRow(row: ViolationLogRow): ViolationDetailRow {
  return {
    id: row.id,
    violationType: row.violation_type,
    details: row.details,
    loggedAt: formatTimestamp(row.logged_at),
  };
}

// fetches every violation logged for one specific session
export async function getViolationsForSession(
  sessionId: string,
): Promise<ViolationDetailRow[]> {
  const { data, error } = await supabase
    .from("violation_logs")
    .select("id, violation_type, details, logged_at")
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: true }); // earliest violation shown first

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as ViolationLogRow[]).map(mapViolationRowToDetailRow);
}