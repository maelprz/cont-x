import { supabase } from "./supabaseClient"; // shared Supabase client, never create a new one

// Shape of the exam row we get back after a successful lookup.
export interface ExamLookupResult {
  id: string; // exams.id — needed later to create the session
  title: string; // exams.title — shown to the student for confirmation
  status: string; // exams.status — checked in a future step, not this one
  attemptsRemaining: number; // how many tries this student has left, for the early warning
}

// Looks up a single exam by its student-facing exam_code, and checks
// how many attempts this student has left, purely as an early warning.
// The real enforcement still happens server-side in verify_and_start_session.
export async function lookupExamByCode(
  examCode: string, // the code the student typed into the Dashboard input
): Promise<ExamLookupResult | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser(); // get the logged-in student's real id

  if (!user) throw new Error("Not authenticated."); // shouldn't happen, but guard anyway

  const { data: exam, error: examError } = await supabase
    .from("exams") // querying the exams table only
    .select("id, title, status, max_attempts") // only the columns this step needs
    .eq("exam_code", examCode) // match on the student-entered code
    .maybeSingle(); // expect zero or one row, never throws on zero

  if (examError) throw new Error(examError.message); // real DB/network errors bubble up
  if (!exam) return null; // no exam has that code

  // count this student's finished attempts (either submitted or timed out) for this exam
  const { count, error: countError } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("exam_id", exam.id)
    .eq("student_id", user.id)
    .in("status", ["submitted", "timed_out"]); // these are the statuses that use up an attempt

  if (countError) throw new Error(countError.message); // real DB/network errors bubble up

  const usedAttempts = count ?? 0; // default to zero if the count came back null
  const attemptsRemaining = Math.max(exam.max_attempts - usedAttempts, 0); // never show a negative number

  return {
    id: exam.id,
    title: exam.title,
    status: exam.status,
    attemptsRemaining,
  };
}