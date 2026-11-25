import { supabase } from "./supabaseClient";
import type {
  StudentResultRow,
  QuestionScoreCell,
} from "../screens/examResult/examResultsScreen.types";
import { buildPoolScores } from "../lib/resultsPools";
import { loadResultRows } from "./resultPaging";

import type { PoolDrawRow } from "../lib/resultsPools";

// raw shape of one question, used to build table columns
type QuestionRow = {
  id: string;
  title: string; // used to build the "Q1", "Q2" label
  max_points: number;
  order_index: number;
};

// raw shape of one completed exam_sessions row
type SessionRow = {
  id: string; // session id
  attempt_number: number;
  joined_at: string | null; // when the attempt started, to work out overtime
  overtime_seconds: number;
  overtime_deduction_applied: number;
  submitted_at: string | null; // when it finished
  total_score: number | null; // null until the session is graded
  score_adjustment: number; // manual change on top of the auto-graded score
  adjustment_reason: string | null;
};

type AnswerRow = {
  id: string;
  session_id: string;
  question_id: string | null;
  pool_draw_id: string | null;
  score: number;
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

function groupBySession<T extends { session_id: string }>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.session_id) ?? [];
    group.push(row);
    groups.set(row.session_id, group);
  }
  return groups;
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

  if (metaError || !metaData)
    throw metaError ?? new Error("Class exam not found.");
  const meta = metaData as unknown as ClassExamMetaRow;
  const exam = unwrapOne(meta.exams);
  const classRow = unwrapOne(meta.classes);

  // all questions of the exam, ordered for column display
  const questions = await loadResultRows<QuestionRow>((from, to) => supabase
    .from("questions")
    .select("id, title, max_points, order_index", { count: "exact" })
    .eq("exam_id", meta.exam_id)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true }).range(from, to), (row) => row.id);

  // one row per submitted/timed-out session of THIS class only
  const sessions = await loadResultRows<SessionRow>((from, to) => supabase
    .from("exam_sessions")
    .select(
      `
      id,
      attempt_number,
      joined_at,
      submitted_at,
      overtime_seconds,
      overtime_deduction_applied,
      total_score,
      score_adjustment,
      adjustment_reason
    `,
      { count: "exact" },
    )
    .eq("class_exam_id", classExamId)
    .in("status", ["submitted", "timed_out"])
    .order("id", { ascending: true }).range(from, to), (row) => row.id);

  // the pooled questions each student drew (empty until the student app draws them)
  const sessionIds = sessions.map((session) => session.id);
  const draws: PoolDrawRow[] = [];
  const answers: AnswerRow[] = [];
  // Bounded IN filters avoid URL-size limits on large classes. Answers are loaded
  // separately so an embedded relation cannot silently hit its own API row cap.
  for (let start = 0; start < sessionIds.length; start += 100) {
    const ids = sessionIds.slice(start, start + 100);
    const [batchDraws, batchAnswers] = await Promise.all([
      loadResultRows<PoolDrawRow>((from, to) => supabase
      .from("session_pool_questions")
      .select(
        "id, session_id, pool_id, pool_title, pool_order_index, question_bank_id, title, max_points",
        { count: "exact" },
      )
      .in("session_id", ids)
      .order("id", { ascending: true }).range(from, to), (row) => row.id),
      loadResultRows<AnswerRow>((from, to) => supabase.from("student_answers")
        .select("id, session_id, question_id, pool_draw_id, score", { count: "exact" })
        .in("session_id", ids)
        .order("id", { ascending: true }).range(from, to), (row) => row.id),
    ]);
    draws.push(...batchDraws);
    answers.push(...batchAnswers);
  }

  // student names come from a function that only returns ID number + name for this teacher's class
  const names = await loadResultRows<StudentNameRow>((from, to) => supabase.rpc(
    "get_class_exam_results_students",
    { p_class_exam_id: classExamId },
    { count: "exact" },
  ).order("session_id", { ascending: true }).range(from, to), (row) => row.session_id);
  const namesBySession = new Map(names.map((n) => [n.session_id, n]));
  if (sessions.some((session) => !namesBySession.has(session.id))) {
    throw new Error("Student names could not be loaded completely. Refresh and try again.");
  }

  // points from the exam's fixed questions; pooled questions add to this per student below
  const fixedMaxScore = questions.reduce((sum, q) => sum + q.max_points, 0);
  const answersBySession = groupBySession(answers);
  const drawsBySession = groupBySession(draws);

  // turns each session into one table row, one cell per question
  const rows: StudentResultRow[] = sessions.map((session) => {
    const sessionAnswers = answersBySession.get(session.id) ?? [];
    const fixedAnswers = new Map(sessionAnswers.map((answer) => [answer.question_id, answer]));
    const questionScores: QuestionScoreCell[] = questions.map((q, index) => {
      // finds this student's answer for this specific question, if any
      const answer = fixedAnswers.get(q.id);
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
      drawsBySession.get(session.id) ?? [],
      sessionAnswers,
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
      overtimeSeconds: session.overtime_seconds ?? 0,
      overtimeDeduction: Number(session.overtime_deduction_applied ?? 0),
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

// counts students still in_progress for one class exam
export async function countInProgressSessions(
  classExamId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true }) // count only, no rows
    .eq("class_exam_id", classExamId) // rls joins on exam_id only so filter here
    .eq("status", "in_progress");
  if (error) throw error;
  return count ?? 0;
}
