import { supabase } from "./supabaseClient";
import type { ExamStatus } from "../screens/examLibrary/examLibraryScreen.types";
import type { ExamCard } from "../screens/examLibrary/examLibraryScreen.types";

// shape of one row coming straight back from supabase
type ExamRow = {
  id: string;
  exam_code: string;
  title: string;
  description: string | null;
  status: ExamStatus; // matches the db check constraint exactly
  created_at: string;
  questions: { count: number }[]; // embedded count from questions table
  exam_sessions: { count: number }[]; // embedded count from exam_sessions table
};

// decides which button text to show based on the exam's real status
function getCtaLabel(status: ExamRow["status"]): string {
  switch (status) {
    case "draft":
      return "Continue Building"; // still being built, not published
    case "saved":
      return "Continue Building"; // saved but not yet published, same as draft
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

// distinct message so the UI can tell "needs a code" apart from a real failure
export const SESSION_CODE_REQUIRED_MESSAGE =
  "This exam needs a session code before it can be published.";

// publishes an exam. If a code is given, sets it and publishes together.
// If no code is given, publishes only if one was already set (via Edit Settings) —
// otherwise throws SESSION_CODE_REQUIRED_MESSAGE so the caller can prompt for one.
export async function publishExam(
  examId: string,
  verificationCode?: string,
): Promise<void> {
  if (verificationCode) {
    const { error } = await supabase
      .from("exams")
      .update({ status: "active", verification_code: verificationCode })
      .eq("id", examId);
    if (error) throw error;
    return;
  }

  const { data, error: fetchError } = await supabase
    .from("exams")
    .select("verification_code")
    .eq("id", examId)
    .single();

  if (fetchError || !data) throw fetchError ?? new Error("Exam not found.");

  if (!data.verification_code) {
    throw new Error(SESSION_CODE_REQUIRED_MESSAGE); // caller shows a prompt, not a dead-end error
  }

  const { error } = await supabase
    .from("exams")
    .update({ status: "active" })
    .eq("id", examId);
  if (error) throw error;
}

export async function endExam(examId: string): Promise<void> {
  const { error } = await supabase
    .from("exams")
    .update({ status: "ended" })
    .eq("id", examId);
  if (error) throw error;
}

export async function deleteExam(examId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("exams")
    .select("status")
    .eq("id", examId)
    .single(); // get the current status of the exam

  if (fetchError || !data) throw fetchError || new Error("Exam not found");

  if (data.status !== "draft" && data.status !== "saved") {
    throw new Error("Only exams in draft or saved status can be deleted");
  }

  const { error: deleteError } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId);
  if (deleteError) throw deleteError;
}
