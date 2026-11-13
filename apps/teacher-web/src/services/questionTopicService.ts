import { supabase } from "./supabaseClient";

export interface SubjectTopic { id: string; name: string; subject_id: string; }

export function requireTopicIds(ids: readonly string[] | undefined): string[] {
  const unique = [...new Set((ids ?? []).filter(Boolean))];
  if (unique.length === 0) throw new Error("Choose at least one subject topic for this question.");
  return unique;
}
export async function getSubjectTopics(subjectId: string): Promise<SubjectTopic[]> {
  const { data, error } = await supabase.from("subject_topics").select("id,name,subject_id").eq("subject_id",subjectId).order("name");
  if (error) throw error;
  return data ?? [];
}
export async function getTopicsByIds(ids: readonly string[]): Promise<SubjectTopic[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("subject_topics")
    .select("id,name,subject_id").in("id", unique).order("name");
  if (error) throw error;
  return data ?? [];
}
export async function createSubjectTopic(subjectId: string, teacherId: string, name: string): Promise<SubjectTopic> {
  const { data, error } = await supabase.from("subject_topics").insert({subject_id:subjectId,created_by:teacherId,name:name.trim()}).select("id,name,subject_id").single();
  if (error) throw error;
  return data;
}

