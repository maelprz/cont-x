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
  submitted_at: string | null; // can be null for timed-out sessions
  exams: unknown; // nested exams row, object or array
  class_exams: unknown; // nested class_exams row, object or array
};

type ExamRel = { title: string; exam_code: string; questions: { max_points: number }[] }; // what we read from exams
type ClassExamRel = { pass_mark: number | null }; // what we read from class_exams

// Same query for both functions, so the two can never drift apart again.
const SESSION_SELECT = `
  id,
  total_score,
  submitted_at,
  class_exams ( pass_mark ),
  exams (
    title,
    exam_code,
    questions ( max_points )
  )
`; // pass_mark is read from class_exams because that is where the column lives

// Turns one database row into one table row, or null if the exam is not readable.
function mapSession(session: SessionRow): ExamHistoryEntry | null {
  const exam = unwrapOne(session.exams as ExamRel | ExamRel[] | null); // the exam this attempt belongs to
  if (!exam) return null; // skip rows where the exam could not be read

  const classExam = unwrapOne(session.class_exams as ClassExamRel | ClassExamRel[] | null); // the class attempt, which holds the pass mark
  const maxScore = (exam.questions ?? []).reduce((sum, q) => sum + (q.max_points ?? 0), 0); // total points available
  const totalScore = session.total_score ?? 0; // treat a missing score as zero
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0; // percent with one decimal, never divides by zero
  const passmark = classExam?.pass_mark ?? null; // null means the teacher left the pass mark blank
  const passed = passmark === null ? true : percentage >= passmark; // no minimum counts as passed, otherwise compare percents

  return {
    id: session.id, // unique key for the list
    examTitle: exam.title, // shown in the Module column
    examCode: exam.exam_code, // shown with the title
    submittedAt: session.submitted_at
      ? new Date(session.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) // readable date
      : "N/A", // timed-out sessions may have no submit time
    totalScore, // raw score
    maxScore, // total points
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

  if (error) { // the database refused or failed
    reportError("fetchExamHistory", error); // keep the real details for the developers
    throw new Error("Could not load your exam history."); // the student sees only a friendly message
  }
  if (!data) return []; // nothing came back

  return (data as unknown as SessionRow[])
    .map(mapSession) // convert each row
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

  if (error) { // the database refused or failed
    reportError("fetchAllExamHistory", error); // keep the real details for the developers
    throw new Error("Could not load your exam history."); // the student sees only a friendly message
  }
  if (!data) return []; // nothing came back

  return (data as unknown as SessionRow[])
    .map(mapSession) // convert each row
    .filter((entry): entry is ExamHistoryEntry => entry !== null); // drop rows we could not read
}