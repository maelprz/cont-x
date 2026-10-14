import { supabase } from "./supabaseClient";

export interface ClassSummary {
  id: string; 
  name: string; 
  offerCode: string; 
  archivedAt: string | null; 
  teacherId: string; 
  teacherName: string; 
  createdAt: string; 
}

export interface SubjectSummary { 
  id: string; 
  name: string; 
  codePrefix: string; 
  createdAt: string; 
  classes: ClassSummary[]; 
}

export interface TeacherOption {
  id: string; 
  fullName: string; 
  idNumber: string; 
}

type TeacherRel = { first_name: string; last_name: string }; // the nested teacher name from the query
type ClassRow = { 
  id: string;
  name: string; 
  class_offer_code: string; 
  archived_at: string | null; 
  created_at: string; 
  teacher_id: string; 
  teacher: TeacherRel | TeacherRel[] | null; // nested teacher, object or array
};
type SubjectRow = { // one subject as the query returns it
  id: string; 
  name: string; 
  code_prefix: string;
  created_at: string; 
  classes: ClassRow[] | null; 
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | undefined { // Supabase may return one nested row as an object or a one-item array
  if (Array.isArray(value)) return value[0]; // it came back as an array, so take the first item
  return value ?? undefined; // it is already an object, or nothing
}

function toFriendlyMessage(error: { code?: string; message: string }): string { // turns a database error into something safe to show
  if (error.code === "42501") return "You do not have permission to do that."; // the database refused a non-admin
  if (error.code === "P0001") return error.message; // messages we wrote ourselves inside the database functions
  console.error(error); // keep the real details in the developer console for now
  return "Something went wrong. Please try again."; // generic message for everything else
}

export async function fetchSubjects(): Promise<SubjectSummary[]> { 
  const { data, error } = await supabase
    .from("subjects")
    .select(`
      id, name, code_prefix, created_at,
      classes (
        id, name, class_offer_code, archived_at, created_at, teacher_id,
        teacher:users!classes_teacher_id_fkey ( first_name, last_name )
      )
    `) 
    .order("name", { ascending: true }); 

  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
  const rows = (data ?? []) as unknown as SubjectRow[]; // give the untyped result a shape

  return rows.map((s) => ({ // convert each database row into the shape the screen uses
    id: s.id, 
    name: s.name, 
    codePrefix: s.code_prefix, 
    createdAt: s.created_at, 
    classes: (s.classes ?? [])
      .map((c) => { // convert each nested class
        const teacher = unwrapOne(c.teacher); // the teacher's name row
        return {
          id: c.id,
          name: c.name,
          offerCode: c.class_offer_code,
          archivedAt: c.archived_at,
          teacherId: c.teacher_id, 
          teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : "Unknown teacher", 
          createdAt: c.created_at,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)), 
  }));
}

export async function fetchTeachers(): Promise<TeacherOption[]> { 
  const { data, error } = await supabase
    .from("users") 
    .select("id, first_name, last_name, id_number") 
    .eq("role", "teacher")
    .order("last_name", { ascending: true });

  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message

  return (data ?? []).map((u) => ({ // convert each row
    id: u.id as string, // account id
    fullName: `${u.first_name} ${u.last_name}`.trim(), // full name
    idNumber: u.id_number as string, // school ID number
  }));
}

export async function createSubject(name: string): Promise<{ id: string; name: string; codePrefix: string }> { // asks the database to create a subject
  const { data, error } = await supabase.rpc("create_subject", { p_name: name }); // the function checks admin rights and picks the prefix
  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
  const row = data as { id: string; name: string; code_prefix: string }; // the new subject row
  return { id: row.id, name: row.name, codePrefix: row.code_prefix }; // hand back what the screen needs
}