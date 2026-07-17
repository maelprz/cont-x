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

// Safely unwraps a nested relation that Supabase may return as
// either a single object or a one-item array, depending on how
// it infers the one-to-one relationship.
function unwrapOne<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]; // take the first (and only) item
  return value ?? undefined; // already a single object, or nothing at all
}

// Real data needed to run the countdown timer for a session.
export interface SessionTimerInfo {
  durationMinutes: number; // exams.duration_minutes, the total time allowed
  joinedAt: string; // exam_sessions.joined_at, when the student actually started
}

// Fetches the real duration and start time for one session, so the
// countdown survives refreshes instead of resetting to a fixed number.
export async function getSessionTimerInfo(
  sessionId: string, // which session to pull timing info for
): Promise<SessionTimerInfo> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("joined_at, exams ( duration_minutes )") // pull the parent exam's duration in the same call
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  const examRow = unwrapOne(data.exams as any); // handles Supabase's array-or-object quirk, same as before

  return {
    durationMinutes: examRow?.duration_minutes ?? 0, // fallback to 0 if somehow missing
    joinedAt: data.joined_at, // real timestamp the session actually started
  };
}

// Fetches just the real student-facing exam_code for one exam.
export async function getExamCode(
  examId: string, // which exam to pull the code for
): Promise<string> {
  const { data, error } = await supabase
    .from("exams")
    .select("exam_code")
    .eq("id", examId)
    .single(); // exactly one exam row expected

  if (error) throw new Error(error.message); // bubble up, let the caller decide the fallback

  return data.exam_code; // real student-facing code
}

// Shape of one answer option after being fetched and reshaped for the UI.
export interface FetchedMCQOption {
  id: string; // mc_options.id, used as the option's key
  text: string; // mc_options.option_text, shown to the student
  isCorrect: boolean; // mc_options.is_correct, used only for local scoring later
}

// Shape of one question after being fetched and reshaped for the UI.
export interface FetchedQuestion {
  id: string; // questions.id, the real database id
  orderIndex: number; // questions.order_index, used to sort and number questions
  title: string; // questions.title, shown as the question heading
  prompt: string; // questions.prompt, shown as the question body text
  type: "mcq" | "coding"; // questions.type, tells the UI which shape to expect
  maxPoints: number; // questions.max_points, kept for future scoring use
  options?: FetchedMCQOption[]; // present only when type is "mcq"
  starterCode?: string | null; // present only when type is "coding"
  language?: string; // coding_question.program_type, passed to Monaco as its language mode
  programType?: "cFunction" | "cProgram"; // NEW — raw program_type, needed by the compiler IPC call
  mainCode?: string | null; // NEW — coding_question.main_code, hidden main for "function" type
  checkPenaltyPerAttempt?: number; // NEW — coding_question.check_penalty_per_attempt, used by Run Code scoring
}

// Converts the teacher-facing program_type label into a real Monaco
// language id. Monaco only understands ids like "c", not "cProgram".
function mapToMonacoLanguage(programType: string | undefined): string {
  switch (programType) {
    case "cProgram": // full C program format
    case "cFunction": // function-only C format
      return "c"; // both still highlight as C syntax
    default:
      return "c"; // safe fallback if the value is missing or unrecognized
  }
}

// NEW — converts the stored program_type into the shape the compiler IPC
// call expects: "function" means student code + hidden main are combined,
// "program" means the student wrote their own main() already.
function mapToProgramType(programType: string | undefined): "function" | "program" {
  return programType === "cFunction" ? "function" : "program";
}

// Fetches every question for one exam, in the order the teacher set,
// including each question's MCQ options or coding starter code.
export async function getExamQuestions(
  examId: string, // which exam's questions to load
): Promise<FetchedQuestion[]> {
  const { data, error } = await supabase
    .from("questions") // start from the questions table
    .select(
      `
      id,
      order_index,
      title,
      prompt,
      type,
      max_points,
      mcq_question ( mc_options ( id, option_text, is_correct ) ),
      coding_question ( starter_code, program_type, main_code, check_penalty_per_attempt )
    `,
    ) // pull matching child rows in the same call
    .eq("exam_id", examId) // only this exam's questions
    .order("order_index", { ascending: true }); // teacher-defined question order

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  // Reshape each raw row into the flat FetchedQuestion shape the UI expects.
  return (data ?? []).map((row: any) => {
    const isCoding = row.type === "coding"; // check which question type this row is

    // Unwrap in case Supabase returned these as one-item arrays.
    const mcqRow = unwrapOne(row.mcq_question); // real mcq_question row, if any
    const codingRow = unwrapOne(row.coding_question); // real coding_question row, if any

    return {
      id: row.id, // real question id
      orderIndex: row.order_index, // used for numbering and sort order
      title: row.title, // question heading
      prompt: row.prompt, // question body text
      type: row.type, // "mcq" or "coding"
      maxPoints: row.max_points, // kept for later scoring
      options: !isCoding
        ? (mcqRow?.mc_options ?? []).map((opt: any) => ({
            id: opt.id, // real option id
            text: opt.option_text, // option label text
            isCorrect: opt.is_correct, // used only for local scoring later
          }))
        : undefined, // coding questions have no options
      starterCode: isCoding ? codingRow?.starter_code : undefined, // pre-filled editor code
      language: isCoding
        ? mapToMonacoLanguage(codingRow?.program_type)
        : undefined, // Monaco language mode
      programType: isCoding ? codingRow?.program_type : undefined, // CHANGED — pass through directly, no translation needed
      mainCode: isCoding ? codingRow?.main_code : undefined, // NEW — hidden main for "function" type
      checkPenaltyPerAttempt: isCoding ? codingRow?.check_penalty_per_attempt ?? 0 : undefined, // NEW — Run Code scoring penalty
    };
  });
}

export interface SubmittedAnswer {
  question_id: string;
  answer_text: string;
}

export interface SubmitExamSessionResult {
  totalScore: number;
  status: string;
}

export async function submitExamSession(
  sessionId: string, // which session to close out
  status: "submitted" | "timed_out", // how it ended
  answers: SubmittedAnswer[], // the student's answers to all questions
): Promise<SubmitExamSessionResult> {
  const { data, error } = await supabase.rpc("submit_exam_session", {
    p_session_id: sessionId, // matches the SQL function's first parameter
    p_status: status, // matches the second parameter
    p_answers: answers, // matches the third parameter, sent as JSON
  });

  if (error) throw new Error(error.message);

  const result = data?.[0]; // rpc calls return an array, we only expect one row

  if (!result) throw new Error("Submission failed. Please try again.");

  return {
    totalScore: result.total_score, // real graded score from the database
    status: result.status, // confirms the session's final status
  }; // bubble up so the screen can decide what to do
}

// Everything one Result screen needs for a single session, fetched by id.
export interface ExamResultDetails {
  examTitle: string; // exams.title
  examCode: string; // exams.exam_code
  durationMinutes: number; // exams.duration_minutes, the full allotted time
  passMark: number; // exams.pass_mark
  joinedAt: string; // exam_sessions.joined_at
  submittedAt: string | null; // exam_sessions.submitted_at, null if somehow still open
  totalScore: number; // exam_sessions.total_score — still a placeholder until real grading exists
  maxScore: number; // sum of questions.max_points for this exam
  totalQuestions: number; // count of every question in this exam, for the "X/Y Correct" metric
  correctCount: number; //
}

// Fetches full result data for one specific session, used by the
// Result screen whether it's just been taken or opened from history.
export async function getExamResultDetails(
  sessionId: string, // which session to load
): Promise<ExamResultDetails> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      `
      joined_at,
      submitted_at,
      total_score,
      exams (
        title,
        exam_code,
        duration_minutes,
        pass_mark,
        questions ( max_points )
      )
    `,
    )
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the screen decide the fallback

  const examRow = unwrapOne(data.exams as any); // handles the same array-or-object quirk as before

  const questionList = examRow?.questions ?? []; // every question in this exam

  const maxScore = questionList.reduce(
    (sum: number, q: { max_points: number }) => sum + (q.max_points ?? 0),
    0,
  ); // total possible points across every question in this exam

  // separate, real query: how many of this session's saved answers scored
  // above zero — coding always scores 0, so only correctly-answered MCQs count
  const { count: correctCount, error: correctError } = await supabase
    .from("student_answers")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("session_id", sessionId)
    .gt("score", 0);

  if (correctError) throw new Error(correctError.message); // bubble up, let the screen decide the fallback

  return {
    examTitle: examRow?.title ?? "Exam",
    examCode: examRow?.exam_code ?? "—",
    durationMinutes: examRow?.duration_minutes ?? 0,
    passMark: examRow?.pass_mark ?? 0,
    joinedAt: data.joined_at,
    submittedAt: data.submitted_at,
    totalScore: data.total_score ?? 0,
    maxScore,
    totalQuestions: questionList.length, // real count of questions in this exam
    correctCount: correctCount ?? 0, // default to zero if the count came back null
  };
}