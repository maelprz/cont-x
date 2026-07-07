import { supabase } from "./supabaseClient"; // shared Supabase client, never create a new one

// Shape of the exam row we get back after a successful lookup.
export interface ExamLookupResult {
  id: string; // exams.id — needed later to create the session
  title: string; // exams.title — shown to the student for confirmation
  status: string; // exams.status — checked in a future step, not this one
}

// Looks up a single exam by its student-facing exam_code.
// Returns null if no exam has that code (treated as "not found" by the caller).
export async function lookupExamByCode(
  examCode: string, // the code the student typed into the Dashboard input
): Promise<ExamLookupResult | null> {
  const { data, error } = await supabase
    .from("exams") // querying the exams table only
    .select("id, title, status") // only the columns this step needs
    .eq("exam_code", examCode) // match on the student-entered code
    .maybeSingle(); // expect zero or one row, never throws on zero

  if (error) throw new Error(error.message); // real DB/network errors bubble up

  return data; // either the matching exam row, or null if none found
}
