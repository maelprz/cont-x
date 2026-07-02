import { supabase } from "./supabaseClient";

// Shape of one row in the Previous Exams table on the dashboard.
export interface ExamHistoryEntry {
  id: string; // exam_sessions.id — unique key for React list rendering
  examTitle: string; // exams.title
  examCode: string; // exams.exam_code
  submittedAt: string; // formatted date string from exam_sessions.submitted_at
  totalScore: number; // exam_sessions.total_score
  maxScore: number; // sum of questions.max_points for this exam
  passmark: number; // exams.pass_mark
  passed: boolean; // derived: totalScore >= passmark
}

// Fetches the 3 most recently submitted exam sessions for the logged-in student.
// Data chain: exam_sessions → exams → questions (for max_points sum)
export async function fetchExamHistory(): Promise<ExamHistoryEntry[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      total_score,
      submitted_at,
      exams (
        title,
        exam_code,
        pass_mark,
        questions (
          max_points
        )
      )
    `,
    )
    .eq("status", "submitted") // only completed exams
    .not("total_score", "is", null) // only sessions that have been scored
    .order("submitted_at", { ascending: false }) // newest first
    .limit(3); // only the latest 3

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data
    .map((session) => {
      // Supabase returns joined relations as an array even for single rows —
      // grab the first element since each session belongs to exactly one exam.
      const examArray = session.exams as unknown as {
        title: string;
        exam_code: string;
        pass_mark: number;
        questions: { max_points: number }[];
      }[];

      const exam = examArray[0]; // the single exam this session belongs to

      // Guard — shouldn't happen if RLS and foreign keys are correct,
      // but worth handling cleanly rather than crashing.
      if (!exam) return null;

      const maxScore = exam.questions.reduce(
        (sum, q) => sum + (q.max_points ?? 0),
        0,
      );

      const totalScore = session.total_score ?? 0;
      const passmark = exam.pass_mark ?? 50;

      return {
        id: session.id,
        examTitle: exam.title,
        examCode: exam.exam_code,
        submittedAt: new Date(session.submitted_at!).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        ),
        totalScore,
        maxScore,
        passmark,
        passed: totalScore >= passmark,
      };
    })
    .filter((entry): entry is ExamHistoryEntry => entry !== null);
  // filter(Boolean) typed version — removes any null entries from the guard above
}

// Fetches ALL submitted exam sessions for the logged-in student.
// Same data shape as fetchExamHistory but no .limit(3)
export async function fetchAllExamHistory(): Promise<ExamHistoryEntry[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      `
      id,
      total_score,
      submitted_at,
      exams (
        title,
        exam_code,
        pass_mark,
        questions (
          max_points
        )
      )
    `,
    )
    .eq("status", "submitted")
    .not("total_score", "is", null)
    .order("submitted_at", { ascending: false }); // no .limit() — returns everything

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data
    .map((session) => {
      const examArray = session.exams as unknown as {
        title: string;
        exam_code: string;
        pass_mark: number;
        questions: { max_points: number }[];
      }[];

      const exam = examArray[0];
      if (!exam) return null;

      const maxScore = exam.questions.reduce(
        (sum, q) => sum + (q.max_points ?? 0),
        0,
      );

      const totalScore = session.total_score ?? 0;
      const passmark = exam.pass_mark ?? 50;

      return {
        id: session.id,
        examTitle: exam.title,
        examCode: exam.exam_code,
        submittedAt: new Date(session.submitted_at!).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        ),
        totalScore,
        maxScore,
        passmark,
        passed: totalScore >= passmark,
      };
    })
    .filter((entry): entry is ExamHistoryEntry => entry !== null);
}
