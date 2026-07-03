import { supabase } from "./supabaseClient";

// creates a blank draft exam row and returns its new id
export async function createDraftExam(teacherId: string): Promise<string> {
  const { data, error } = await supabase
    .from("exams")
    .insert({
      teacher_id: teacherId, // links exam to the teacher who made it
      title: "Untitled Exam", // placeholder until teacher renames it
      status: "draft", // new exams always start as draft
    })
    .select("id") // only need the new row's id back
    .single(); // insert makes exactly one row

  if (error) throw error; // let the hook decide how to show this error

  return data.id;
}