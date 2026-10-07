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