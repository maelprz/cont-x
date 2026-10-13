import { supabase } from "./supabaseClient";

export interface AssignedSubject {
  id: string;
  name: string;
}

// Subjects assigned to a teacher stored in subject_teachers table
export async function getAssignedSubjects(teacherId: string): Promise<AssignedSubject[]> {
  const { data, error } = await supabase
    .from("subject_teachers")
    .select("subjects(id, name)")
    .eq("teacher_id", teacherId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.subjects as unknown as AssignedSubject | null)
    .filter((subject): subject is AssignedSubject => subject !== null);
}

// counts classes under a subject
export async function getClassCountsBySubject(teacherId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("classes")
    .select("subject_id")
    .eq("teacher_id", teacherId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.subject_id] = (counts[row.subject_id] ?? 0) + 1;
  });
  return counts;
}