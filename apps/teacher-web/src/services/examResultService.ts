import { supabase } from "./supabaseClient";
import type {
  StudentResultRow,
  QuestionScoreCell,
} from "../screens/examResult/examResultsScreen.types";
import { buildPoolScores } from "../lib/resultsPools";
import type { PoolDrawRow } from "../lib/resultsPools";

// raw shape of one question, used to build table columns
type QuestionRow = {
  id: string;
  title: string; // used to build the "Q1", "Q2" label
  max_points: number;
  order_index: number;
};

// raw shape of one exam_sessions row with its nested joins
type SessionRow = {
  id: string; // session id
  attempt_number: number;
  total_score: number | null; // null until the session is graded
  score_adjustment: number; // manual change on top of the auto-graded score
  adjustment_reason: string | null;
  student_answers: {
    question_id: string | null; // null for an answer to a pooled question
    pool_draw_id: string | null; // set for an answer to a pooled question
    score: number;
  }[]; // joined answers
};

// one row from get_class_exam_results_students (teachers can't read users directly)
type StudentNameRow = {
  session_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
};

// one class_exams row plus the exam and class it points to; supabase may type a
// to-one embed as an object or a one-item array, so both are accepted
type One<T> = T | T[] | null;
type ClassExamMetaRow = {
  id: string;
  exam_id: string;
  duration_minutes: number;
  pass_mark: number | string | null; // numeric column, a percent
  classes: One<{ name: string }>;
  exams: One<{ title: string; exam_code: string | null }>;
};

function unwrapOne<T>(value: One<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type ExamResultsData = {
  examTitle: string;
  examCode: string;
  className: string;
  durationMinutes: number;
  passMark: number | null; // percent; null means the teacher set no minimum
  rows: StudentResultRow[];
};

// fetches everything the results screen needs for one exam as delivered to one class
export async function getClassExamResults(
  classExamId: string,
): Promise<ExamResultsData> {
  // header info: duration and pass mark live on class_exams, title and code on exams
  const { data: metaData, error: metaError } = await supabase
    .from("class_exams")
    .select(
      "id, exam_id, duration_minutes, pass_mark, classes(name), exams(title, exam_code)",
    )
    .eq("id", classExamId)
    .single();

  if (metaError || !metaData) throw metaError ?? new Error("Class exam not found.");
  const meta = metaData as unknown as ClassExamMetaRow;
  const exam = unwrapOne(meta.exams);
  const classRow = unwrapOne(meta.classes);

  // all questions of the exam, ordered for column display
  const { data: questionData, error: questionError } = await supabase
    .from("questions")
    .select("id, title, max_points, order_index")
    .eq("exam_id", meta.exam_id)
    .order("order_index", { ascending: true });

  if (questionError) throw questionError;
  const questions = (questionData as QuestionRow[]) ?? [];

  // one row per submitted/timed-out session of THIS class only, with student + answers
  const { data: sessionData, error: sessionError } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      attempt_number,
      total_score,
      score_adjustment,
      adjustment_reason,
      student_answers(question_id, pool_draw_id, score)
    `,
    )
    .eq("class_exam_id", classExamId)
    .in("status", ["submitted", "timed_out"]); // excludes sessions that never finished

  if (sessionError) throw sessionError;
  const sessions = (sessionData as unknown as SessionRow[]) ?? [];

  // the pooled questions each student drew (empty until the student app draws them)
  const sessionIds = sessions.map((session) => session.id);
  let draws: PoolDrawRow[] = [];
  if (sessionIds.length > 0) {
    const { data: drawData, error: drawError } = await supabase
      .from("session_pool_questions")
      .select("id, session_id, pool_id, pool_title, pool_order_index, max_points")
      .in("session_id", sessionIds);
    if (drawError) throw drawError;
    draws = (drawData as PoolDrawRow[] | null) ?? [];
  }

  // student names come from a function that only returns ID number + name for this teacher's class
  const { data: nameData, error: nameError } = await supabase.rpc(
    "get_class_exam_results_students",
    { p_class_exam_id: classExamId },
  );
  if (nameError) throw nameError;
  const namesBySession = new Map(
    ((nameData as StudentNameRow[] | null) ?? []).map((n) => [n.session_id, n]),
  );

  // points from the exam's fixed questions; pooled questions add to this per student below
  const fixedMaxScore = questions.reduce((sum, q) => sum + q.max_points, 0);

  // turns each session into one table row, one cell per question
  const rows: StudentResultRow[] = sessions.map((session) => {
    const questionScores: QuestionScoreCell[] = questions.map((q, index) => {
      // finds this student's answer for this specific question, if any
      const answer = session.student_answers.find(
        (a) => a.question_id === q.id,
      );
      const score = answer?.score ?? 0; // no answer means zero score

      return {
        questionId: q.id,
        label: `Q${index + 1}`, // built from position, not stored text
        title: q.title,
        maxPoints: q.max_points,
        score,
        status: score >= q.max_points ? "correct" : "incorrect", // binary only, no partial
      };
    });

    const student = namesBySession.get(session.id);
    const poolScores = buildPoolScores(
      draws.filter((draw) => draw.session_id === session.id),
      session.student_answers,
    );
    const maxScore =
      fixedMaxScore + poolScores.reduce((sum, cell) => sum + cell.maxPoints, 0);

    return {
      sessionId: session.id,
      studentName: student
        ? `${student.first_name} ${student.last_name}`
        : "Unknown Student", // fallback if no name came back for this attempt
      studentIdNumber: student?.id_number ?? null,
      totalScore: session.total_score ?? 0,
      maxScore,
      attemptNumber: session.attempt_number,
      scoreAdjustment: session.score_adjustment ?? 0,
      adjustmentReason: session.adjustment_reason,
      questionScores,
      poolScores,
    };
  });

  return {
    examTitle: exam?.title ?? "",
    examCode: exam?.exam_code ?? "",
    className: classRow?.name ?? "Unknown class",
    durationMinutes: meta.duration_minutes,
    passMark: meta.pass_mark === null ? null : Number(meta.pass_mark),
    rows,
  };
}

// sets one student's total score by hand (extra credit, corrections); the database checks
// that the caller teaches this class, keeps the auto-graded base, and logs the change
export async function overrideSessionScore(
  sessionId: string,
  newTotal: number,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("override_session_score", {
    p_session_id: sessionId,
    p_new_total: newTotal,
    p_reason: reason,
  });
  if (error) throw error;
}