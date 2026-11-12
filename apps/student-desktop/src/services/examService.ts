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
    .select(
      "id, max_attempts, starts_at, ends_at, ended_at, exams!inner(id, title, exam_code)",
    )
    .eq("exams.exam_code", examCode) // match on the student-entered code
    .in("status", ["scheduled", "active"])
    .is("ended_at", null)
    .order("starts_at", { ascending: true, nullsFirst: true });

  if (examError) throw new Error(examError.message); // real DB/network errors bubble up

  // RLS controls display visibility; the start RPC controls entry and overtime resume.
  // Keep delivery ordering and ended-at filtering without a client-clock cutoff.
  if (!rows || rows.length === 0) return null;
  const classExam = rows[0];
  const exam = unwrapOne(classExam.exams as any); // handles Supabase's array-or-object quirk
  if (!exam) return null;

  // count this student's finished attempts (either submitted or timed out) for this class exam
  const { count, error: countError } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("class_exam_id", classExam.id) // attempts are limited per class exam, same as the server
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
  if (result.status === "invalid_code")
    throw new Error("Invalid verification code.");
  if (result.status === "not_available")
    throw new Error("This exam is not available.");
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
    "get_class_exam_question_count", // server function that checks class_exams.status and counts pool picks
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

export interface SessionTiming {
  serverNow: string;
  normalDeadline: string;
  hardDeadline: string;
  forceSubmit: boolean;
  classExamId: string;
  sessionStatus: string;
  classExamStatus: string;
  allowOvertime: boolean;
  overtimeMinutes: number;
  overtimeDeduction: number;
  durationMinutes: number;
}

export async function getSessionTiming(
  sessionId: string,
): Promise<SessionTiming> {
  const { data, error } = await supabase.rpc("get_session_timing", {
    p_session_id: sessionId,
  });
  if (error || !data)
    throw new Error(error?.message ?? "Exam timing not found.");
  return data as SessionTiming;
}

export function subscribeSessionTiming(
  classExamId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`exam-timing:${classExamId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "class_exams",
        filter: `id=eq.${classExamId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// Fetches the real duration and start time for one session, so the
// countdown survives refreshes instead of resetting to a fixed number.
export async function getSessionTimerInfo(
  sessionId: string, // which session to pull timing info for
): Promise<SessionTimerInfo> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("joined_at, class_exams ( duration_minutes )") // duration comes through the session's class exam
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  const classExam = unwrapOne(data.class_exams as any); // handles Supabase's array-or-object quirk, same as before

  if (!classExam) throw new Error("Exam settings not found."); // fail loudly instead of silently timing 0 minutes

  return {
    durationMinutes: classExam.duration_minutes, // the real allowed minutes
    joinedAt: data.joined_at, // real timestamp the session actually started
  };
}

// Fetches just the real student-facing exam_code for one exam.
export async function getExamCode(
  examId: string, // which exam to pull the code for
): Promise<string | null> {
  // FIXED: exams.exam_code is nullable in the schema, so the type says so
  const { data, error } = await supabase
    .from("exams")
    .select("exam_code")
    .eq("id", examId)
    .single(); // exactly one exam row expected

  if (error) throw new Error(error.message); // bubble up, let the caller decide the fallback

  return data.exam_code ?? null; // real student-facing code, or null if none was set
}

// Shape of one answer option after being fetched and reshaped for the UI.
// (The server does not send which option is correct. Grading happens on the server.)
export interface FetchedMCQOption {
  id: string; // mc_options.id, used as the option's key
  text: string; // mc_options.option_text, shown to the student
}

// Shape of one question after being fetched and reshaped for the UI.
export interface FetchedQuestion {
  id: string; // questions.id, the real database id (for a pooled question: its draw id, session_pool_questions.id)
  poolDrawId: string | null; // set when this question was drawn from a random pool for this attempt
  orderIndex: number; // questions.order_index, the teacher's own order (the list itself is already in the student's order)
  title: string; // questions.title, shown as the question heading
  prompt: string; // questions.prompt, shown as the question body text
  type: "mcq" | "coding" | "fitb"; // questions.type, tells the UI which shape to expect
  maxPoints: number; // questions.max_points, kept for future scoring use
  sectionId: string | null; // the exam section this question belongs to, if the exam has sections
  sectionTitle: string | null; // that section's title, shown above the question
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

// Fetches this attempt's questions, already in the order THIS student should see them:
// sections in the teacher's order, and inside each section either the teacher's order or,
// when the class exam randomizes, a shuffle that stays the same if the student resumes.
// Done by the server function get_session_questions (see contx_session_questions.sql).
export async function getSessionQuestions(
  sessionId: string, // which attempt's questions to load
): Promise<FetchedQuestion[]> {
  const { data, error } = await supabase.rpc("get_session_questions", {
    p_session_id: sessionId, // matches the SQL function's only parameter
  });

  if (error) throw new Error(error.message); // bubble up, let the hook decide the message

  // Reshape each raw item into the flat FetchedQuestion shape the UI expects.
  return ((data ?? []) as any[]).map((row: any) => {
    const isCoding = row.type === "coding"; // check which question type this row is
    return {
      id: row.id, // real question id (or the draw id for a pooled question)
      poolDrawId: row.pool_draw_id ?? null, // null for questions placed directly in the exam
      orderIndex: row.order_index, // the teacher's own order number
      title: row.title, // question heading
      prompt: row.prompt, // question body text
      type: row.type, // "mcq", "coding" or "fitb"
      maxPoints: row.max_points, // kept for later scoring
      sectionId: row.section_id ?? null, // which section it sits in
      sectionTitle: row.section_title ?? null, // shown above the question
      options:
        row.type === "mcq"
          ? (row.options ?? []).map((opt: any) => ({
              id: opt.id, // real option id
              text: opt.option_text, // option label text
            }))
          : undefined, // only multiple choice has options
      starterCode: isCoding ? row.coding?.starter_code : undefined, // pre-filled editor code
      language: isCoding
        ? mapToMonacoLanguage(row.coding?.program_type)
        : undefined, // Monaco language mode
      programType: isCoding ? row.coding?.program_type : undefined, // pass through directly, no translation needed
      mainCode: isCoding ? row.coding?.main_code : undefined, // hidden main for "function" type
      checkPenaltyPerAttempt: isCoding
        ? (row.coding?.check_penalty_per_attempt ?? 0)
        : undefined, // Run Code scoring penalty
    } as FetchedQuestion;
  });
}

export interface SubmittedAnswer {
  question_id: string | null; // null for a pooled question
  pool_draw_id?: string | null; // set for a pooled question, instead of question_id
  answer_text: string;
  time_spent_seconds?: number; // seconds spent on this question (WBS 6.7)
  change_count?: number; // how many times the answer was changed after it was first given (WBS 8.16)
  answered_at?: string | null; // when the answer was last changed, ISO time (WBS 8.13 overtime rule)
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

// The teacher's exam rules for one attempt, set per class in Manage Classes > Edit Settings.
export interface SessionRules {
  sequential: boolean; // class_exams.sequential: answer in order, no skipping ahead past an unanswered question
  allowReview: boolean; // class_exams.allow_review
  allowOvertime: boolean; // class_exams.allow_overtime: false = time-up auto-submits; true = the student may keep going
  overtimePolicy: "accept" | "zero"; // class_exams.overtime_policy
  answerChangeDeduction: number; // class_exams.answer_change_deduction, points lost per changed answer (0 = none)
}

// Fetches the rules for one attempt. The student can read their own session and their own class exam.
export async function getSessionRules(
  sessionId: string,
): Promise<SessionRules> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      "class_exams ( sequential, allow_review, allow_overtime, overtime_policy, answer_change_deduction )",
    )
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(error.message); // let the hook decide what to do

  const rules = unwrapOne(data.class_exams as any) as any; // same array-or-object quirk as elsewhere
  if (!rules) throw new Error("Exam settings not found.");
  return {
    sequential: rules?.sequential ?? false,
    allowReview: rules?.allow_review ?? false,
    allowOvertime: rules?.allow_overtime ?? false,
    overtimePolicy: rules?.overtime_policy === "zero" ? "zero" : "accept",
    answerChangeDeduction: Number(rules?.answer_change_deduction ?? 0),
  };
}

// Everything one Result screen needs for a single session, fetched by id.
export interface ExamResultDetails {
  overtimeSeconds: number; // exam_sessions.overtime_seconds, time spent past the normal deadline
  overtimeDeduction: number; // exam_sessions.overtime_deduction_applied, points removed for overtime
  examTitle: string; // exams.title
  examCode: string; // exams.exam_code
  durationMinutes: number; // class_exams.duration_minutes
  passMark: number; // class_exams.pass_mark (0 when none)
  joinedAt: string; // exam_sessions.joined_at
  submittedAt: string | null; // exam_sessions.submitted_at
  totalScore: number; // exam_sessions.total_score, the auto-graded part only
  scoreAdjustment: number; // exam_sessions.score_adjustment, the teacher's manual change (0 if none)
  adjustmentReason: string | null; // exam_sessions.adjustment_reason, why the teacher changed it
  finalScore: number; // totalScore + scoreAdjustment, the number the student should see
  maxScore: number; // total points, including bank-placed and pooled questions
  totalQuestions: number; // direct + bank-placed + pooled questions
  correctCount: number; // saved answers that scored above zero
  allowReview: boolean; // class_exams.allow_review
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
      score_adjustment,
      adjustment_reason,
      overtime_seconds,
      overtime_deduction_applied,
      class_exams (
        duration_minutes,
        pass_mark,
        allow_review
      ),
      exams (
        title,
        exam_code
      )
    `,
    ) // FIXED: questions(max_points) removed because totals come from the server; adjustment columns added
    .eq("id", sessionId)
    .single(); // exactly one session row expected

  if (error) throw new Error(error.message); // bubble up, let the screen decide the fallback

  const examRow = unwrapOne(data.exams as any); // handles the array-or-object quirk
  const classExam = unwrapOne(data.class_exams as any); // same unwrap for the class exam

  const { data: totalsData, error: totalsError } = await supabase.rpc(
    "get_sessions_result_totals", // server function that also sees bank-placed and pooled questions
    { p_session_ids: [sessionId] }, // one session, wrapped in an array
  );
  if (totalsError) throw new Error(totalsError.message); // bubble up, let the screen decide the fallback

  const totals = ((totalsData ?? []) as any[])[0]; // the one row for this session
  if (!totals) throw new Error("Could not load the exam totals."); // fail loudly rather than showing a wrong max score

  const { count: correctCount, error: correctError } = await supabase
    .from("student_answers")
    .select("id", { count: "exact", head: true }) // only need the count, not the rows
    .eq("session_id", sessionId)
    .gt("score", 0); // answers that earned points

  if (correctError) throw new Error(correctError.message); // bubble up, let the screen decide the fallback

  const totalScore = data.total_score ?? 0; // auto-graded score, 0 if missing
  const scoreAdjustment = Number(data.score_adjustment ?? 0); // numeric can arrive as text, so coerce

  return {
    examTitle: examRow?.title ?? "Exam",
    examCode: examRow?.exam_code ?? "\u2014", // dash shown when the code is missing
    durationMinutes: classExam?.duration_minutes ?? 0, // read from class_exams
    passMark: classExam?.pass_mark ?? 0, // read from class_exams
    joinedAt: data.joined_at,
    submittedAt: data.submitted_at,
    totalScore, // raw auto-graded score
    scoreAdjustment, // teacher's manual change
    adjustmentReason: data.adjustment_reason ?? null, // null when no adjustment
    finalScore: totalScore + scoreAdjustment, // what the student should see and be judged on
    overtimeSeconds: data.overtime_seconds ?? 0, // 0 when the student wasn't in overtime
    overtimeDeduction: Number(data.overtime_deduction_applied ?? 0), // numeric can arrive as text, so coerce
    maxScore: Number(totals.max_score ?? 0), // server total, bank-placed and pooled questions included
    totalQuestions: Number(totals.total_questions ?? 0), // server count, bank-placed and pooled questions included
    correctCount: correctCount ?? 0, // default to zero if the count came back null
    allowReview: classExam?.allow_review ?? false, // off unless the teacher turned it on
  };
}

// One answer option in the review. isCorrect is null while keys are still hidden.
export interface ReviewOption {
  id: string; // option id, compared against the student's saved answer
  text: string; // option label shown to the student
  isCorrect: boolean | null; // null means "the server did not reveal it yet"
}

// One reviewed question with the student's own answer.
export interface ReviewItem {
  key: string; // questions.id, or the draw id for a pooled question
  poolDrawId: string | null; // set only for pooled questions
  title: string; // question heading
  prompt: string; // question body
  type: "mcq" | "coding" | "fitb"; // decides how the answer is drawn
  maxPoints: number; // what the question was worth
  sectionTitle: string | null; // section heading, if any
  answerText: string | null; // null when the student left it blank
  score: number; // points earned on this question
  pointDeduction: number; // points removed by penalties
  options?: ReviewOption[]; // present only for mcq
  acceptedAnswers: string[] | null; // accepted FITB alternatives
  correctAnswers: string[]; // correct labels/answers or coding reference solution
}

// Everything the review section needs.
export interface SessionReview {
  keysRevealed: boolean; // true once the server authorizes answer review
  items: ReviewItem[]; // questions in display order
}

// Loads the student's reviewable answers. The server refuses unless review is allowed.
export async function getSessionReview(
  sessionId: string,
): Promise<SessionReview> {
  const { data, error } = await supabase.rpc("get_session_answer_review", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    title: string;
    prompt: string;
    type: ReviewItem["type"];
    sectionTitle: string | null;
    answer: string;
    correctAnswers: string[];
    score: number;
    maxPoints: number;
  }[];
  return {
    keysRevealed: true,
    items: rows.map((row) => ({
      key: row.id,
      poolDrawId: null,
      title: row.title,
      prompt: row.prompt,
      type: row.type,
      maxPoints: Number(row.maxPoints),
      sectionTitle: row.sectionTitle,
      answerText: row.answer,
      score: Number(row.score),
      pointDeduction: 0,
      acceptedAnswers: row.type === "fitb" ? row.correctAnswers : null,
      correctAnswers: row.correctAnswers,
    })),
  };
}
