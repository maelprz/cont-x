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

// Shape returned after a successful verification + session start.
export interface SessionStartResult {
  sessionId: string; // exam_sessions.id — needed to load the exam question screen
  status: string; // "in_progress" — confirms the session is now active
}

// Calls the server-side RPC to check the code and start the session.
// The real verification_code never leaves the database in this call.
export async function verifySessionCode(
  examId: string, // which exam the student is trying to enter
  verificationCode: string, // the code they typed into the modal
): Promise<SessionStartResult> {
  const { data, error } = await supabase.rpc("verify_and_start_session", {
    p_exam_id: examId, // matches the SQL function's first parameter
    p_verification_code: verificationCode, // matches the second parameter
  });

  if (error) throw new Error(error.message); // wrong code, bad status, etc. surface here

  const result = data?.[0]; // rpc calls return an array, we only expect one row

  if (!result) throw new Error("Verification failed. Please try again.");

  return {
    sessionId: result.session_id, // real session id from the database
    status: result.status, // should always be "in_progress" at this point
  };
}

// Real detail-card data for the Confirmation screen.
export interface ExamConfirmationDetails {
  totalQuestions: number; // count of rows in questions for this exam
  durationMinutes: number; // exams.duration_minutes, set directly by the teacher
  passMark: number; // exams.pass_mark, e.g. 70
}

// Fetches the real numbers behind the Confirmation screen's detail cards.
export async function getExamConfirmationDetails(
  examId: string, // which exam to pull details for
): Promise<ExamConfirmationDetails> {
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select(`duration_minutes, pass_mark`)
    .eq("id", examId)
    .single(); // exactly one exam row expected

  if (examError) throw new Error(examError.message); // bubble up, let the hook decide the message

  const { data: totalQuestions, error: countError } = await supabase.rpc(
    "get_exam_question_count",
    { p_exam_id: examId },
  );

  if (countError) throw new Error(countError.message);

  return {
    totalQuestions: totalQuestions ?? 0, // pull count out of embedded array
    durationMinutes: exam.duration_minutes, // straight from the column, no math needed
    passMark: exam.pass_mark,
  };
}