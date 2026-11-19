import type { StudentOption } from "./subjectsClassesService";
import { supabase } from "./supabaseClient";

type ClassRow = {
  id: string;
  name: string;
  class_offer_code: string;
  archived_at: string | null;
  subject: { name: string } | null;
};

type StudentRow = { id: string; full_name: string; id_number: string };

export type TeacherClass = {
  id: string;
  name: string;
  code: string;
  subjectName: string | null;
  archived: boolean;
};

export async function getTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, class_offer_code, archived_at, subject:subjects(name)")
    .eq("teacher_id", teacherId)
    .order("name")
    .order("id")
    .returns<ClassRow[]>();

  if (error) throw new Error("Could not load your classes.");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.class_offer_code,
    subjectName: row.subject?.name ?? null,
    archived: row.archived_at !== null,
  }));
}

function toStudentOption(row: StudentRow): StudentOption {
  return { id: row.id, fullName: row.full_name, idNumber: row.id_number };
}

export async function getTeacherClassRoster(classId: string): Promise<StudentOption[]> {
  const students: StudentOption[] = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .rpc("teacher_class_roster", { p_class_id: classId })
      .order("full_name")
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error || !Array.isArray(data)) throw new Error("Could not load this class roster.");
    const rows = data as StudentRow[];
    students.push(...rows.map(toStudentOption));
    if (rows.length < pageSize) return students;
  }
}

export async function searchTeacherEnrollmentStudents(
  classId: string,
  term: string,
): Promise<StudentOption[]> {
  const { data, error } = await supabase
    .rpc("search_teacher_enrollment_students", { p_class_id: classId, p_term: term });

  if (error || !Array.isArray(data)) throw new Error("Could not search for students.");
  return (data as StudentRow[]).map(toStudentOption);
}

export async function enrollTeacherClassStudent(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase.rpc("teacher_enroll_student", {
    p_class_id: classId,
    p_student_id: studentId,
  });

  if (error) {
    const expected = error.code === "P0001" || error.code === "42501";
    throw new Error(expected ? error.message : "Could not enroll the student.");
  }
}
