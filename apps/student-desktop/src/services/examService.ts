import { supabase } from "./supabaseClient"; // shared Supabase client, never create a new one

// Shape of the exam row we get back after a successful lookup.
export interface ExamLookupResult {
  id: string;
  classExamId: string;
  title: string;
  attemptsRemaining: number;
}

// Looks up a single exam by its student-facing exam_code, and checks
// how many attempts this student has left.
export async function lookupExamByCode(
  examCode: string,
): Promise<ExamLookupResult | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser(); // get the logged-in student's real id

  if (!user) throw new Error("Not authenticated."); // shouldn't happen, but guard anyway

  const { data: rows, error: examError } = await supabase
    .from("class_exams")
    .select("id, max_attempts, exams!inner(id, title, exam_code)")
    .eq("exams.exam_code", examCode) // match on the student-entered code
    .eq("status", "active");

  if (examError) throw new Error(examError.message); // real DB/network errors bubble up
  if (!rows || rows.length === 0) return null; // no match found, let the caller handle it

  const classExam = rows[0]; // we expect exactly one row, so we can take the first one
  const exam = unwrapOne(classExam.exams as any); // handles Supabase's array-or-object quirk
  if (!exam) return null;

  // count this student's finished attempts (either submitted or timed out) for this class exam
  const { count, error: countError } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("class_exam_id", classExam.id) // CHANGED: attempts are limited per class exam, same as the server
    .eq("student_id", user.id)
    .in("status", ["submitted", "timed_out", "removed"]); // these are the statuses that use up an attempt

  if (countError) throw new Error(countError.message); // real DB/network errors bubble up

  const usedAttempts = count ?? 0; // default to zero if the count came back null
  const attemptsRemaining = Math.max(classExam.max_attempts - usedAttempts, 0); // never show a negative number

  return {
    id: exam.id,
    classExamId: classExam.id,
    title: exam.title,
    attemptsRemaining,
  };
}

// Shape returned after a successful verification + session start.
export interface SessionStartResult {
  sessionId: string; // exam_sessions.id, needed to load the exam question screen
  status: string; // "in_progress" confirms the session is now active
}

// Calls the server-side RPC to check the code and start the session.
// The real verification_code never leaves the database in this call.
export async function verifySessionCode(
  classExamId: string, // class_exams.id, which exam the student is trying to enter
  verificationCode: string,
): Promise<SessionStartResult> {
  const { data, error } = await supabase.rpc("verify_and_start_session", {
    p_class_exam_id: classExamId, // matches the SQL function's first parameter
    p_verification_code: verificationCode, // matches the second parameter
  });

  if (error) throw new Error(error.message); // wrong code, bad status, etc. surface here

  const result = data?.[0]; // rpc calls return an array, we only expect one row

  if (!result) throw new Error("Verification failed. Please try again.");
  if (!result.session_id)
    throw new Error("You have no attempts left for this exam.");

  return {
    sessionId: result.session_id, // real session id from the database
    status: result.status, // should always be "in_progress" at this point
  };
}

// Real detail-card data for the Confirmation screen.
export interface ExamConfirmationDetails {
  totalQuestions: number; // count of rows in questions for this exam
  durationMinutes: number; // class_exams.duration_minutes, set by the teacher per class
  passMark: number; // class_exams.pass_mark as a percent, e.g. 70 (0 when the teacher set none)
}

// Fetches the real numbers behind the Confirmation screen's detail cards.
export async function getExamConfirmationDetails(
  classExamId: string, // class_exams.id, because duration and pass mark live there now
): Promise<ExamConfirmationDetails> {
  const { data: classExam, error: classExamError } = await supabase
    .from("class_exams") // the table that owns the per-class settings
    .select("duration_minutes, pass_mark") // only the two numbers the cards need
    .eq("id", classExamId) // only this class's row
    .single(); // exactly one row expected

  if (classExamError) throw new Error(classExamError.message); // bubble up, let the hook decide the message

  const { data: totalQuestions, error: countError } = await supabase.rpc(
    "get_class_exam_question_count", // CHANGED: new server function that checks class_exams.status and counts pool picks
    { p_class_exam_id: classExamId }, // it takes the class exam id directly
  );

  if (countError) throw new Error(countError.message);

  return {
    totalQuestions: totalQuestions ?? 0, // fall back to 0 if the server returned null
    durationMinutes: classExam.duration_minutes, // this class's own duration
    passMark: classExam.pass_mark ?? 0, // null means no minimum, treated as 0 for now
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
  durationMinutes: number; // class_exams.duration_minutes, the total time allowed
  joinedAt: string; // exam_sessions.joined_at, when the student actually started
}

// Fetches the real duration and start time for one session, so the
// countdown survives refreshes instead of resetting to a fixed number.
export async function getSessionTimerInfo(
  sessionId: string, // which session to pull timing info for
): Promise<SessionTimerInfo> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("joined_at, class_exams ( duration_minutes )") // CHANGED: duration comes through the session's class exam
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  const classExam = unwrapOne(data.class_exams as any); // handles Supabase's array-or-object quirk, same as before

  if (!classExam) throw new Error("Exam settings not found."); // CHANGED: fail loudly instead of silently timing 0 minutes

  return {
    durationMinutes: classExam.duration_minutes, // the real allowed minutes
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
  programType?: "cFunction" | "cProgram"; // raw program_type, needed by the compiler IPC call
  mainCode?: string | null; // coding_question.main_code, hidden main for "function" type
  checkPenaltyPerAttempt?: number; // coding_question.check_penalty_per_attempt, used by Run Code scoring
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
      programType: isCoding ? codingRow?.program_type : undefined, // pass through directly, no translation needed
      mainCode: isCoding ? codingRow?.main_code : undefined, // hidden main for "function" type
      checkPenaltyPerAttempt: isCoding
        ? (codingRow?.check_penalty_per_attempt ?? 0)
        : undefined, // Run Code scoring penalty
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
  durationMinutes: number; // class_exams.duration_minutes, the full allotted time
  passMark: number; // class_exams.pass_mark (0 when the teacher set none)
  joinedAt: string; // exam_sessions.joined_at
  submittedAt: string | null; // exam_sessions.submitted_at, null if somehow still open
  totalScore: number; // exam_sessions.total_score
  maxScore: number; // sum of questions.max_points for this exam (pool questions not included yet)
  totalQuestions: number; // count of every question in this exam, for the "X/Y Correct" metric
  correctCount: number; // how many saved answers scored above zero
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
      class_exams (
        duration_minutes,
        pass_mark
      ),
      exams (
        title,
        exam_code,
        questions ( max_points )
      )
    `,
    ) // CHANGED: duration and pass mark now come from class_exams
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the screen decide the fallback

  const examRow = unwrapOne(data.exams as any); // handles the same array-or-object quirk as before
  const classExam = unwrapOne(data.class_exams as any); // same unwrap for the class exam

  const questionList = examRow?.questions ?? []; // every question in this exam

  const maxScore = questionList.reduce(
    (sum: number, q: { max_points: number }) => sum + (q.max_points ?? 0),
    0,
  ); // total possible points across every question in this exam

  // separate, real query: how many of this session's saved answers scored
  // above zero. Coding scores come from Run Code, so this is a rough count.
  const { count: correctCount, error: correctError } = await supabase
    .from("student_answers")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("session_id", sessionId)
    .gt("score", 0);

  if (correctError) throw new Error(correctError.message); // bubble up, let the screen decide the fallback

  return {
    examTitle: examRow?.title ?? "Exam",
    examCode: examRow?.exam_code ?? "\u2014", // dash shown when the code is missing
    durationMinutes: classExam?.duration_minutes ?? 0, // CHANGED: read from class_exams
    passMark: classExam?.pass_mark ?? 0, // CHANGED: read from class_exams
    joinedAt: data.joined_at,
    submittedAt: data.submitted_at,
    totalScore: data.total_score ?? 0,
    maxScore,
    totalQuestions: questionList.length, // real count of questions in this exam
    correctCount: correctCount ?? 0, // default to zero if the count came back null
  };
}