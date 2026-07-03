import { supabase } from "./supabaseClient";
import type { ExamCard } from "../screens/examLibrary/examLibraryScreen.types";

// shape of one row coming straight back from supabase
type ExamRow = {
  id: string;
  exam_code: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "ended"; // matches the db check constraint exactly
  created_at: string;
  questions: { count: number }[]; // embedded count from questions table
  exam_sessions: { count: number }[]; // embedded count from exam_sessions table
};

// decides which button text to show based on the exam's real status
function getCtaLabel(status: ExamRow["status"]): string {
  switch (status) {
    case "draft":
      return "Continue Building"; // still being built, not published
    case "active":
      return "Edit Exam"; // published and students can join
    case "ended":
      return "View Results"; // submissions closed, show outcomes
  }
}

// turns a raw database row into the shape the UI card expects
function mapExamRowToCard(row: ExamRow): ExamCard {
  return {
    id: row.id,
    code: row.exam_code,
    title: row.title,
    description: row.description ?? "", // fallback if description is empty
    status: row.status,
    questionCount: row.questions[0]?.count ?? 0, // pull count out of embedded array
    createdAt: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    studentCount: row.exam_sessions[0]?.count ?? 0,
    ctaLabel: getCtaLabel(row.status),
  };
}

// fetches all exams belonging to one teacher, with question and student counts
export async function getExamsByTeacherId(
  teacherId: string,
): Promise<ExamCard[]> {
  const { data, error } = await supabase
    .from("exams")
    .select(
      `
      id,
      exam_code,
      title,
      description,
      status,
      created_at,
      questions(count),
      exam_sessions(count)
    `,
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false }); // newest exams first

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as ExamRow[]).map(mapExamRowToCard);
}
