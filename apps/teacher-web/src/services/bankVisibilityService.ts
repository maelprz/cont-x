import { supabase } from "./supabaseClient";

// matches the check constraint on both settings tables
export type BankVisibilityLevel = "course" | "account" | "department";

export interface BankVisibilitySettings {
  // The "main question bank" setting. When it's set (not null) it overrides
  // every per-subject setting below; null means no override.
  mainLevel: BankVisibilityLevel | null;
  // per-subject ("sub-question bank") level, keyed by subject id. A subject
  // with no row yet behaves as 'course', the default.
  subjectLevels: Record<string, BankVisibilityLevel>;
}

// This controls how far the teacher's OWN questions travel — who else can see them.
export async function getBankVisibilitySettings(teacherId: string): Promise<BankVisibilitySettings> {
  const [mainResult, subjectResult] = await Promise.all([
    supabase
      .from("question_bank_teacher_settings")
      .select("main_visibility_level")
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    supabase
      .from("question_bank_teacher_subject_settings")
      .select("subject_id, visibility_level")
      .eq("teacher_id", teacherId),
  ]);

  if (mainResult.error) throw mainResult.error;
  if (subjectResult.error) throw subjectResult.error;

  const subjectLevels: Record<string, BankVisibilityLevel> = {};
  (subjectResult.data ?? []).forEach((row) => {
    subjectLevels[row.subject_id] = row.visibility_level as BankVisibilityLevel;
  });

  return {
    mainLevel: (mainResult.data?.main_visibility_level as BankVisibilityLevel | null) ?? null,
    subjectLevels,
  };
}

export async function setSubjectVisibility(
  teacherId: string,
  subjectId: string,
  level: BankVisibilityLevel,
): Promise<void> {
  const { error } = await supabase
    .from("question_bank_teacher_subject_settings")
    .upsert({ teacher_id: teacherId, subject_id: subjectId, visibility_level: level });
  if (error) throw error;
}

// pass null to clear the override and fall back to each subject's own setting
export async function setMainVisibility(
  teacherId: string,
  level: BankVisibilityLevel | null,
): Promise<void> {
  const { error } = await supabase
    .from("question_bank_teacher_settings")
    .upsert({ teacher_id: teacherId, main_visibility_level: level });
  if (error) throw error;
}