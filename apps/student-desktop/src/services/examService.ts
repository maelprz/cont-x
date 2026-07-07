import { supabase } from "./supabaseClient"; // shared Supabase client, never create a new one

// Shape of the exam row we get back after a successful lookup.
export interface ExamLookupResult {
  id: string; // exams.id — needed later to create the session
  title: string; // exams.title — shown to the student for confirmation
  status: string; // exams.status — checked in a future step, not this one
}

// Looks up a single exam by its student-facing exam_code.
// Returns null if no exam has that code (treated as "not found" by the caller).
export async function lookupExamByCode(
  examCode: string, // the code the student typed into the Dashboard input
): Promise<ExamLookupResult | null> {
  const { data, error } = await supabase
    .from("exams") // querying the exams table only
    .select("id, title, status") // only the columns this step needs
    .eq("exam_code", examCode) // match on the student-entered code
    .maybeSingle(); // expect zero or one row, never throws on zero

  if (error) throw new Error(error.message); // real DB/network errors bubble up

  return data; // either the matching exam row, or null if none found
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
  durationMinutes: number | null; // null if starts_at/ends_at aren't both set
  passMark: number; // exams.pass_mark, e.g. 70
}

// Fetches the real numbers behind the Confirmation screen's detail cards.
export async function getExamConfirmationDetails(
  examId: string, // which exam to pull details for
): Promise<ExamConfirmationDetails> {
  const { data, error } = await supabase
    .from("exams")
    .select(
      `
      starts_at,
      ends_at,
      pass_mark,
      questions(count)
    `,
    )
    .eq("id", examId)
    .single(); // exactly one exam row expected

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  // both timestamps must exist to compute a real duration
  let durationMinutes: number | null = null;
  if (data.starts_at && data.ends_at) {
    const start = new Date(data.starts_at).getTime(); // ms since epoch, start
    const end = new Date(data.ends_at).getTime(); // ms since epoch, end
    durationMinutes = Math.round((end - start) / 60000); // convert ms to whole minutes
  }

  return {
    totalQuestions: data.questions[0]?.count ?? 0, // pull count out of embedded array
    durationMinutes,
    passMark: data.pass_mark,
  };
}