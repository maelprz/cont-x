import { supabase } from "./supabaseClient"; 

// one attempt of a student in a class exam, just enough to build the attempt picker
export type StudentAttempt = {
  sessionId: string; // exam_sessions.id, used to load that attempt's movement history
  attemptNumber: number;
  status: "in_progress" | "submitted" | "timed_out" | "removed"; 
};

// loads every attempt this student has made in ONE class exam, oldest first
export async function getStudentAttempts(
  classExamId: string,
  studentId: string,
): Promise<StudentAttempt[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("id, attempt_number, status")
    .eq("class_exam_id", classExamId)
    .eq("student_id", studentId) 
    .order("attempt_number", { ascending: true });
  if (error) throw new Error(error.message); 

  return (data ?? []).map((row) => ({
    sessionId: row.id as string,
    attemptNumber: row.attempt_number as number,
    status: row.status as StudentAttempt["status"],
  }));
}