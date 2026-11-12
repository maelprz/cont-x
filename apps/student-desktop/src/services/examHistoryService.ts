import { supabase } from "./supabaseClient"; // shared Supabase client for the desktop app
import { reportError } from "./errorReporter"; // keeps the real error details away from the student's screen

// Safely unwraps a nested relation that Supabase may return as
// either a single object or a one-item array.
function unwrapOne<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]; // it came back as an array, so take the first item
  return value ?? undefined; // it is already a single object, or nothing at all
}

// Shape of one row in the Previous Exams table and the Archive screen.
export interface ExamHistoryEntry {
  id: string; // exam_sessions.id, the unique key for React list rendering
  examTitle: string; // exams.title
  examCode: string; // exams.exam_code
  submittedAt: string; // formatted date, or "N/A" when the session has no submit time
  totalScore: number; // exam_sessions.total_score
  maxScore: number; // sum of questions.max_points for this exam
  percentage: number; // totalScore out of maxScore as a percent, one decimal place
  passmark: number | null; // class_exams.pass_mark as a percent; null means the teacher set no minimum
  hasPassMark: boolean; // false when there is no minimum, so the screen can show "Completed" instead of "Passed"
  passed: boolean; // true when percentage reaches the pass mark, or when there is no minimum
}

// One exam_sessions row as the query below returns it.
type SessionRow = {
  id: string; // session id
  total_score: number | null; // score, null until graded
  score_adjustment: number | null; // NEW: teacher's manual change
  submitted_at: string | null; // can be null for timed-out sessions
  exams: unknown; // nested exams row, object or array
  class_exams: unknown; // nested class_exams row, object or array
};

type ExamRel = { title: string; exam_code: string };
type ClassExamRel = { pass_mark: number | null }; // what we read from class_exams

// Same query for both functions, so the two can never drift apart again.
const SESSION_SELECT = `
  id,
  total_score,
  score_adjustment,
  submitted_at,
  class_exams ( pass_mark ),
  exams ( title, exam_code )
`; // pass_mark is read from class_exams because that is where the column lives

// Points available from the random-pool questions each attempt drew, by session id.
// (The exam's own question list does not include them: every student draws different ones.)
async function loadMaxScores(
  sessionIds: string[],
): Promise<Map<string, number>> {
  const maxScores = new Map<string, number>(); // session id mapped to its max score
  if (sessionIds.length === 0) return maxScores; // nothing to ask the server
  const { data, error } = await supabase.rpc("get_sessions_result_totals", {
    p_session_ids: sessionIds, // one call for the whole list
  });
  if (error) {
    reportError("loadMaxScores", error); // keep real details away from the student
    return maxScores; // lists still load, just with a 0 max score
  }
  for (const row of (data ?? []) as any[]) {
    maxScores.set(row.session_id, Number(row.max_score ?? 0)); // store each session's total
  }
  return maxScores;
}

// Turns one database row into one table row, or null if the exam is not readable.
// Turns one database row into one table row, or null if the exam is not readable.
function mapSession(
  session: SessionRow, // one exam_sessions row from the query
  maxScore = 0, // total points for this attempt, from get_sessions_result_totals
): ExamHistoryEntry | null {
  const exam = unwrapOne(session.exams as ExamRel | ExamRel[] | null); // the exam this attempt belongs to
  if (!exam) return null; // skip rows where the exam could not be read

  const classExam = unwrapOne(
    session.class_exams as ClassExamRel | ClassExamRel[] | null,
  ); // holds the pass mark

  const totalScore =
    (session.total_score ?? 0) + Number(session.score_adjustment ?? 0); // auto-graded score plus any teacher adjustment
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0; // percent with one decimal, never divides by zero
  const passmark = classExam?.pass_mark ?? null; // null means the teacher left the pass mark blank
  const passed = passmark === null ? true : percentage >= passmark; // no minimum counts as passed, otherwise compare percents

  return {
    id: session.id, // unique key for the list
    examTitle: exam.title, // shown in the Module column
    examCode: exam.exam_code, // shown with the title
    submittedAt: session.submitted_at
      ? new Date(session.submitted_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) // readable date
      : "N/A", // timed-out sessions may have no submit time
    totalScore, // score including the teacher's adjustment
    maxScore, // total points, bank-placed and pooled questions included
    percentage, // percent score
    passmark, // pass mark, or null
    hasPassMark: passmark !== null, // lets the screen tell "no minimum" apart from a real pass mark
    passed, // final result
  };
}

// Fetches the 3 most recently completed exam sessions for the logged-in student.
export async function fetchExamHistory(): Promise<ExamHistoryEntry[]> {
  const { data, error } = await supabase
    .from("exam_sessions") // each row is one attempt
    .select(SESSION_SELECT) // the shared query above
    .in("status", ["submitted", "timed_out"]) // both count as a completed attempt
    .not("total_score", "is", null) // only sessions that have been scored
    .order("submitted_at", { ascending: false, nullsFirst: false }) // newest first, sessions with no date go last
    .limit(3); // only the latest 3

  if (error) {
    // the database refused or failed
    reportError("fetchExamHistory", error); // keep the real details for the developers
    throw new Error("Could not load your exam history."); // the student sees only a friendly message
  }
  if (!data) return []; // nothing came back

  const rows = data as unknown as SessionRow[];
  const maxScores = await loadMaxScores(rows.map((row) => row.id)); // CHANGED: server totals instead of pooled points
  return rows
    .map((row) => mapSession(row, maxScores.get(row.id) ?? 0)) // convert each row
    .filter((entry): entry is ExamHistoryEntry => entry !== null); // drop rows we could not read
}

// Fetches ALL completed exam sessions for the logged-in student.
export async function fetchAllExamHistory(): Promise<ExamHistoryEntry[]> {
  const { data, error } = await supabase
    .from("exam_sessions") // each row is one attempt
    .select(SESSION_SELECT) // the shared query above
    .in("status", ["submitted", "timed_out"]) // both count as a completed attempt
    .not("total_score", "is", null) // only sessions that have been scored
    .order("submitted_at", { ascending: false, nullsFirst: false }); // newest first, no limit

  if (error) {
    // the database refused or failed
    reportError("fetchAllExamHistory", error); // keep the real details for the developers
    throw new Error("Could not load your exam history."); // the student sees only a friendly message
  }
  if (!data) return []; // nothing came back

  const rows = data as unknown as SessionRow[];
  const maxScores = await loadMaxScores(rows.map((row) => row.id)); // CHANGED: server totals instead of pooled points
  return rows
    .map((row) => mapSession(row, maxScores.get(row.id) ?? 0)) // convert each row
    .filter((entry): entry is ExamHistoryEntry => entry !== null); // drop rows we could not read
}
