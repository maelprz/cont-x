import { supabase } from "./supabaseClient";
import type {
  ExamStatus,
  ExamCard,
  ClassExamStatus,
} from "../screens/examLibrary/examLibraryScreen.types";

// shape of one row coming straight back from supabase
type ExamRow = {
  id: string;
  subject_id: string;
  exam_code: string;
  title: string;
  description: string | null;
  status: ExamStatus; // 'draft' | 'saved'
  created_at: string;
  subjects: { name: string } | null;
  questions: { count: number }[]; // count from questions table
  exam_question_pools: { pick_count: number }[]; // each pool adds pick_count questions to a student's exam
  class_exams: {
    id: string;
    status: ClassExamStatus;
    starts_at: string | null;
    ended_at: string | null;
    latest_submission?: { submitted_at: string | null }[];
    latest_adjustment?: { adjusted_at: string | null }[];
    classes: { id: string; name: string; class_students: { count: number }[] } | null;
  }[];
};

// decides which button text to show based on authoring status + whether it's been published anywhere
function getCtaLabel(status: ExamRow["status"], hasAttachments: boolean): string {
  if (status === "draft") return "Continue Building"; // still being built, not published
  // status === "saved"
  return hasAttachments ? "Manage Classes" : "Add to a Class";
}

// turns a raw database row into the shape the UI card expects
function mapExamRowToCard(row: ExamRow): ExamCard {
  const classAttachments = row.class_exams.map((ce) => ({
    classExamId: ce.id,
    classId: ce.classes?.id ?? "",
    className: ce.classes?.name ?? "Unknown class",
    status: ce.status,
    startsAt: ce.starts_at,
    endedAt: ce.ended_at,
    resultsUpdatedAt: [ce.ended_at, ce.latest_submission?.[0]?.submitted_at, ce.latest_adjustment?.[0]?.adjusted_at]
      .filter((time): time is string => !!time)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
    studentCount: ce.classes?.class_students[0]?.count ?? 0, // students enrolled in the class
  }));

  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? null,
    code: row.exam_code,
    title: row.title,
    description: row.description ?? "", // fallback if description is empty
    status: row.status,
    // questions written into the exam + what each random pool will draw
    questionCount:
      (row.questions[0]?.count ?? 0) +
      row.exam_question_pools.reduce((sum, pool) => sum + pool.pick_count, 0),
    createdAt: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    classAttachments,
    ctaLabel: getCtaLabel(row.status, classAttachments.length > 0),
  };
}

// fetches all exams belonging to one teacher, with question counts and every
// class this exam has been attached to (each with its own status + headcount)
export async function getExamsByTeacherId(
  teacherId: string,
  includeResultsUpdates = false,
): Promise<ExamCard[]> {
  const query = supabase
    .from("exams")
    .select(
      `
      id,
      subject_id,
      exam_code,
      title,
      description,
      status,
      created_at,
      subjects(name),
      questions(count),
      exam_question_pools(pick_count),
      class_exams(
        id,
        status,
        starts_at,
        ended_at,
        ${includeResultsUpdates ? `
        latest_submission:exam_sessions!exam_sessions_class_exam_id_fkey(submitted_at),
        latest_adjustment:exam_sessions!exam_sessions_class_exam_id_fkey(adjusted_at),` : ""}
        classes(id, name, class_students(count))
      )
    `,
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false }); // newest exams first

  if (includeResultsUpdates) {
    const submission = "class_exams.latest_submission";
    const adjustment = "class_exams.latest_adjustment";
    query.in(`${submission}.status`, ["submitted", "timed_out"])
      .order("submitted_at", { referencedTable: submission, ascending: false, nullsFirst: false })
      .limit(1, { referencedTable: submission })
      .in(`${adjustment}.status`, ["submitted", "timed_out"])
      .order("adjusted_at", { referencedTable: adjustment, ascending: false, nullsFirst: false })
      .limit(1, { referencedTable: adjustment });
  }

  const { data, error } = await query;

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as ExamRow[]).map(mapExamRowToCard);
}

// don't let a teacher delete an exam that's attached to any class
export async function deleteExam(examId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("class_exams")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    throw new Error(
      "This exam is in a class and can't be deleted. Remove it from every class first.",
    );
  }

  // random pools reference the exam — clear them (items first) so the delete
  // doesn't depend on those foreign keys cascading
  const { data: poolRows, error: poolsError } = await supabase
    .from("exam_question_pools")
    .select("id")
    .eq("exam_id", examId);
  if (poolsError) throw poolsError;

  const poolIds = (poolRows ?? []).map((p) => p.id);
  if (poolIds.length > 0) {
    const { error: itemsError } = await supabase
      .from("exam_question_pool_items")
      .delete()
      .in("pool_id", poolIds);
    if (itemsError) throw itemsError;

    const { error: poolDeleteError } = await supabase
      .from("exam_question_pools")
      .delete()
      .in("id", poolIds);
    if (poolDeleteError) throw poolDeleteError;
  }

  const { error: deleteError } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId);
  if (deleteError) throw deleteError;
}
