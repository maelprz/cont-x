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

export interface StudentOption {
  id: string;
  fullName: string;
  idNumber: string;
}

export type CsvRowOutcome =
  | "enrolled"
  | "already_enrolled"
  | "not_found"
  | "not_a_student"
  | "invalid_format"
  | "duplicate_in_file";

export interface CsvRowResult {
  position: number;
  idNumber: string;
  outcome: CsvRowOutcome;
}

export interface CsvEnrollResult {
  counts: Partial<Record<CsvRowOutcome, number>>;
  results: CsvRowResult[];
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
type SubjectRow = {
  // one subject as the query returns it
  id: string;
  name: string;
  code_prefix: string;
  created_at: string;
  classes: ClassRow[] | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | undefined {
  // Supabase may return one nested row as an object or a one-item array
  if (Array.isArray(value)) return value[0]; // it came back as an array, so take the first item
  return value ?? undefined; // it is already an object, or nothing
}

function toFriendlyMessage(error: { code?: string; message: string }): string {
  // turns a database error into something safe to show
  if (error.code === "42501") return "You do not have permission to do that."; // the database refused a non-admin
  if (error.code === "23505") return "That name is already in use."; // a unique rule refused a rename or edit
  if (error.code === "P0001") return error.message; // messages we wrote ourselves inside the database functions
  console.error(error); // keep the real details in the developer console for now
  return "Something went wrong. Please try again."; // generic message for everything else
}

export async function fetchSubjects(): Promise<SubjectSummary[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select(
      `
      id, name, code_prefix, created_at,
      classes (
        id, name, class_offer_code, archived_at, created_at, teacher_id,
        teacher:users!classes_teacher_id_fkey ( first_name, last_name )
      )
    `,
    )
    .order("code_prefix", { ascending: true });

  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
  const rows = (data ?? []) as unknown as SubjectRow[]; // give the untyped result a shape

  return rows.map((s) => ({
    // convert each database row into the shape the screen uses
    id: s.id,
    name: s.name,
    codePrefix: s.code_prefix,
    createdAt: s.created_at,
    classes: (s.classes ?? [])
      .map((c) => {
        // convert each nested class
        const teacher = unwrapOne(c.teacher); // the teacher's name row
        return {
          id: c.id,
          name: c.name,
          offerCode: c.class_offer_code,
          archivedAt: c.archived_at,
          teacherId: c.teacher_id,
          teacherName: teacher
            ? `${teacher.first_name} ${teacher.last_name}`.trim()
            : "Unknown teacher",
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

  return (data ?? []).map((u) => ({
    // convert each row
    id: u.id as string, // account id
    fullName: `${u.first_name} ${u.last_name}`.trim(), // full name
    idNumber: u.id_number as string, // school ID number
  }));
}

export async function createSubject(
  name: string,
): Promise<{ id: string; name: string; codePrefix: string }> {
  // asks the database to create a subject
  const { data, error } = await supabase.rpc("create_subject", {
    p_name: name,
  }); // the function checks admin rights and picks the prefix
  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
  const row = data as { id: string; name: string; code_prefix: string }; // the new subject row
  return { id: row.id, name: row.name, codePrefix: row.code_prefix }; // hand back what the screen needs
}

export async function createClass(
  subjectId: string,
  name: string,
  teacherId: string,
): Promise<{ id: string; name: string; offerCode: string }> {
  // asks the database to create a class
  const { data, error } = await supabase.rpc("create_class", {
    p_subject_id: subjectId,
    p_name: name,
    p_teacher_id: teacherId,
  }); // the function checks rights, makes the code, and links the teacher to the subject
  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
  const row = data as { id: string; name: string; class_offer_code: string }; // the new class row
  return { id: row.id, name: row.name, offerCode: row.class_offer_code }; // hand back what the screen needs
}

export async function archiveClass(classId: string): Promise<void> { // asks the database to archive a class
  const { error } = await supabase.rpc("archive_class", { p_class_id: classId }); // the function checks rights and refuses if an exam is active
  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message, such as the active exam notice
}

export async function searchStudents(term: string): Promise<StudentOption[]> {
  const clean = term.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
  if (clean.length < 2) return [];
  const pattern = `"%${clean}%"`;

  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, id_number")
    .eq("role", "student")
    .or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},id_number.ilike.${pattern}`,
    ) // match on any of the three fields
    .order("last_name", { ascending: true }) // stable, readable order
    .limit(20);

  if (error) throw new Error(toFriendlyMessage(error));

  return (data ?? []).map((u) => ({
    // convert database rows to the picker shape
    id: u.id as string, // account id
    fullName: `${u.first_name} ${u.last_name}`.trim(), // display name
    idNumber: u.id_number as string, // school ID
  }));
}

export async function enrollStudent(
  classId: string,
  studentId: string,
): Promise<void> {
  // asks the database to enroll one student
  const { error } = await supabase.rpc("enroll_student", {
    p_class_id: classId,
    p_student_id: studentId,
  }); // the function checks rights, the class, the student, and writes the audit row
  if (error) throw new Error(toFriendlyMessage(error)); // stop with a safe message
}

export async function enrollStudentsCsv(
  classId: string,
  idNumbers: string[],
): Promise<CsvEnrollResult> {
  const { data, error } = await supabase.rpc("enroll_students_csv", {
    p_class_id: classId, // must match the SQL parameter name exactly
    p_id_numbers: idNumbers, // supabase-js sends a string[] as a Postgres text[]
  });

  if (error) throw new Error(toFriendlyMessage(error));

  const payload = data as {
    counts?: CsvEnrollResult["counts"];
    results?: { position: number; id_number: string; outcome: CsvRowOutcome }[];
  } | null; // jsonb arrives untyped, so we describe what we expect
  if (!payload || !Array.isArray(payload.results)) {
    // guards against a stale function version returning something else
    throw new Error("Unexpected response from the server."); // safe message, no internals leaked
  }

  return {
    counts: payload.counts ?? {}, // empty object if nothing was tallied
    results: payload.results.map((r) => ({
      position: r.position, // keep the position as is
      idNumber: r.id_number, // convert snake_case to camelCase
      outcome: r.outcome, // keep the outcome label
    })),
  };
}
