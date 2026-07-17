import { supabase } from "./supabaseClient";
import type {
  StudentResultRow,
  QuestionScoreCell,
} from "../screens/examResult/examResultsScreen.types";

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
  total_score: number;
  student: { first_name: string; last_name: string } | null; // joined from users
  student_answers: { question_id: string; score: number }[]; // joined answers
};

// raw shape of the exam's header info
type ExamMetaRow = {
  title: string;
  exam_code: string;
  duration_minutes: number;
  pass_mark: number;
};

export type ExamResultsData = {
  examTitle: string;
  examCode: string;
  durationMinutes: number;
  passMark: number;
  rows: StudentResultRow[];
};

// fetches everything the results screen needs for one exam
export async function getExamResults(examId: string): Promise<ExamResultsData> {
  // grabs exam header info (title, code, duration, pass mark)
  const { data: examData, error: examError } = await supabase
    .from("exams")
    .select("title, exam_code, duration_minutes, pass_mark")
    .eq("id", examId)
    .single();

  if (examError || !examData) throw examError ?? new Error("Exam not found.");
  const exam = examData as ExamMetaRow;

  // grabs all questions for this exam, ordered for column display
  const { data: questionData, error: questionError } = await supabase
    .from("questions")
    .select("id, title, max_points, order_index")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (questionError) throw questionError;
  const questions = (questionData as QuestionRow[]) ?? [];

  // grabs one row per submitted/timed-out session, with student name + answers
  const { data: sessionData, error: sessionError } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      attempt_number,
      total_score,
      student:users(first_name, last_name),
      student_answers(question_id, score)
    `,
    )
    .eq("exam_id", examId)
    .in("status", ["submitted", "timed_out"]); // excludes sessions that never finished

  if (sessionError) throw sessionError;
  const sessions = (sessionData as unknown as SessionRow[]) ?? [];

  // total points possible, used for the "X/Y" total column
  const maxScore = questions.reduce((sum, q) => sum + q.max_points, 0);

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
        maxPoints: q.max_points,
        score,
        status: score >= q.max_points ? "correct" : "incorrect", // binary only, no partial
      };
    });

    return {
      sessionId: session.id,
      studentName: session.student
        ? `${session.student.first_name} ${session.student.last_name}`
        : "Unknown Student", // fallback if the join somehow comes back empty
      totalScore: session.total_score,
      maxScore,
      attemptNumber: session.attempt_number,
      questionScores,
    };
  });

  return {
    examTitle: exam.title,
    examCode: exam.exam_code,
    durationMinutes: exam.duration_minutes,
    passMark: exam.pass_mark,
    rows,
  };
}
