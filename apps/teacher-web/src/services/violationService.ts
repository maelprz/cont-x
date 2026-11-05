import { supabase } from "./supabaseClient";
import type {
  ViolationSessionRow,
  ViolationDetailRow,
} from "../screens/violationLogs/violationMonitoringScreen.types";

type SessionRow = {
  id: string;
  status: "in_progress" | "submitted" | "timed_out" | "removed";
  joined_at: string;
  submitted_at: string | null;
  removed_at: string | null;
  attempt_number: number;
  violation_logs: { count: number }[];
};

export type RemoveStudentResult = "removed" | "not_in_progress";

// one row from get_class_exam_results_students (teachers can't read the users table directly)
type StudentNameRow = {
  session_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
};

export function formatTimestamp(iso: string): string {
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
    removedAt: row.removed_at,
    violationCount: row.violation_logs[0]?.count ?? 0, // pull count out of embedded array
  };
}

// one class_exams row plus the class and exam it points to; supabase may type a
// to-one embed as an object or a one-item array, so both are accepted
type One<T> = T | T[] | null;
type ClassExamHeaderRow = {
  classes: One<{ name: string }>;
  exams: One<{ title: string; exam_code: string | null }>;
};

function unwrapOne<T>(value: One<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// the exam title, code and class name shown at the top of the monitoring screen
export type ClassExamHeader = {
  examTitle: string;
  examCode: string;
  className: string;
};

export async function getClassExamHeader(
  classExamId: string,
): Promise<ClassExamHeader> {
  const { data, error } = await supabase
    .from("class_exams")
    .select("classes(name), exams(title, exam_code)")
    .eq("id", classExamId)
    .single();

  if (error || !data) throw error ?? new Error("Class exam not found.");
  const row = data as unknown as ClassExamHeaderRow;
  const exam = unwrapOne(row.exams);
  const classRow = unwrapOne(row.classes);

  return {
    examTitle: exam?.title ?? "",
    examCode: exam?.exam_code ?? "",
    className: classRow?.name ?? "Unknown class",
  };
}

// every attempt made in ONE class's delivery of an exam
export async function getSessionsForClassExam(
  classExamId: string,
): Promise<ViolationSessionRow[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      status,
      joined_at,
      submitted_at,
      removed_at,
      attempt_number,
      violation_logs(count)
    `,
    )
    .eq("class_exam_id", classExamId)
    .order("joined_at", { ascending: false }); // most recent attempts first

  if (error) throw error; // let the hook decide how to show this error

  // names and ID numbers come from a function that only returns this teacher's own class
  const { data: nameData, error: nameError } = await supabase.rpc(
    "get_class_exam_results_students",
    { p_class_exam_id: classExamId },
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
  questions: One<{ title: string }>;
};

// turns a raw violation row into the shape the modal expects
function mapViolationRowToDetailRow(row: ViolationLogRow): ViolationDetailRow {
  return {
    id: row.id,
    violationType: row.violation_type,
    details: row.details,
    loggedAt: formatTimestamp(row.logged_at),
    questionTitle: unwrapOne(row.questions)?.title ?? null,
  };
}

// fetches every violation logged for one specific session
export async function getViolationsForSession(
  sessionId: string,
): Promise<ViolationDetailRow[]> {
  const { data, error } = await supabase
    .from("violation_logs")
    .select("id, violation_type, details, logged_at, questions(title)")
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: true }); // earliest violation shown first

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as ViolationLogRow[]).map(mapViolationRowToDetailRow);
}

export async function removeStudentFromExam(
  sessionId: string, // which attempt the teacher wants to remove
): Promise<RemoveStudentResult> {
  const { data, error } = await supabase.rpc("remove_student_from_exam", {
    p_session_id: sessionId, // matches the SQL function's only parameter
  });

  if (error) throw new Error(error.message); // wrap it so the hook can show the real message (e.g. not authorized)

  return data as RemoveStudentResult; // the function returns plain text, one of the two values above
}

// one violation, flattened for the class-wide log
export type ClassViolationRow = {
  id: string; // violation row id
  sessionId: string; // which attempt it belongs to
  violationType: "alt_tab" | "windows" | "screenshot" | "copy_paste"; // what the student did
  details: string | null; // extra text logged with it
  loggedAt: string; // raw ISO time, used for sorting
  questionTitle: string | null; // question open at the time, if known
};

export const CLASS_LOG_LIMIT = 500; // most violations we load per class exam

// fetches the newest violations across every attempt of ONE class exam
export async function getViolationsForClassExam(
  classExamId: string, // the class exam being reviewed
): Promise<ClassViolationRow[]> {
  const { data, error } = await supabase
    .from("violation_logs") // the table teachers can already read for their classes
    .select(
      "id, session_id, violation_type, details, logged_at, questions(title), exam_sessions!inner(class_exam_id)", // inner join so the filter below removes other classes' rows
    )
    .eq("exam_sessions.class_exam_id", classExamId) // only this class exam, never the whole exam
    .order("logged_at", { ascending: false }) // newest first
    .limit(CLASS_LOG_LIMIT); // stay under the server row cap

  if (error) throw error; // let the hook show the message

  return (data as any[]).map((row) => ({
    id: row.id, // keep the row id
    sessionId: row.session_id, // used to look up the student
    violationType: row.violation_type, // what happened
    details: row.details, // optional extra text
    loggedAt: row.logged_at, // raw time for sorting
    questionTitle: unwrapOne(row.questions)?.title ?? null, // supabase may return an object or a one-item array
  }));
}
