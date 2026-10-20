import { supabase } from "./supabaseClient";
import type { ClassExamStatus } from "../screens/examLibrary/examLibraryScreen.types";

// a class the signed-in teacher could attach this exam to:
// their own class, under the exam's own subject, not already attached to this exam
export interface AttachableClass {
  id: string;
  name: string;
}

export async function getAttachableClasses(
  examId: string,
  teacherId: string,
): Promise<AttachableClass[]> {
  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select("subject_id")
    .eq("id", examId)
    .single();
  if (examError || !examRow) throw examError ?? new Error("Exam not found.");

  const { data: alreadyAttached, error: attachedError } = await supabase
    .from("class_exams")
    .select("class_id")
    .eq("exam_id", examId);
  if (attachedError) throw attachedError;

  const excludeIds = (alreadyAttached ?? []).map((row) => row.class_id);

  let query = supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .eq("subject_id", examRow.subject_id);

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("name");
  if (error) throw error;

  return data ?? [];
}

// full settings snapshot for one class_exams row — the per-class equivalent
// of the old "Edit Settings" modal data, now scoped to a single attachment
export interface ClassExamSettingsData {
  classExamId: string;
  classId: string;
  className: string;
  status: ClassExamStatus;
  durationMinutes: number;
  maxAttempts: number;
  passMark: number | null;
  randomizeOrder: boolean;
  verificationCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export async function getClassExamSettings(
  classExamId: string,
): Promise<ClassExamSettingsData> {
  const { data, error } = await supabase
    .from("class_exams")
    .select(
      `
      id,
      class_id,
      status,
      duration_minutes,
      max_attempts,
      pass_mark,
      randomize_order,
      verification_code,
      starts_at,
      ends_at,
      classes(name)
    `,
    )
    .eq("id", classExamId)
    .single();

  if (error || !data) throw error ?? new Error("Class attachment not found.");

  const classes = data.classes as unknown as { name: string } | null;

  return {
    classExamId: data.id,
    classId: data.class_id,
    className: classes?.name ?? "Unknown class",
    status: data.status,
    durationMinutes: data.duration_minutes,
    maxAttempts: data.max_attempts,
    passMark: data.pass_mark,
    randomizeOrder: data.randomize_order,
    verificationCode: data.verification_code,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
  };
}

// attaches an exam to a class for the first time, in 'scheduled' state —
// equivalent of the old "fill in settings then publish" flow, but publishing
// (going active) is now a separate, explicit step via activateClassExam below
export interface NewClassExamSettings {
  durationMinutes: number;
  maxAttempts: number;
  passMark: number | null;
  randomizeOrder: boolean;
  verificationCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export async function attachExamToClass(
  examId: string,
  classId: string,
  settings: NewClassExamSettings,
): Promise<string> {
  const { data, error } = await supabase
    .from("class_exams")
    .insert({
      exam_id: examId,
      class_id: classId,
      status: "scheduled",
      duration_minutes: settings.durationMinutes,
      max_attempts: settings.maxAttempts,
      pass_mark: settings.passMark,
      randomize_order: settings.randomizeOrder,
      verification_code: settings.verificationCode,
      starts_at: settings.startsAt,
      ends_at: settings.endsAt,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Could not add this exam to the class.");
  return data.id;
}

// distinct message so the UI can tell "needs a code" apart from a real failure —
// same role SESSION_CODE_REQUIRED_MESSAGE played in the old examService.ts
export const SESSION_CODE_REQUIRED_MESSAGE =
  "This class needs a session code before the exam can go live.";

// moves one class_exams row from 'scheduled' to 'active' — this is "Publish" now
export async function activateClassExam(
  classExamId: string,
  verificationCode?: string,
): Promise<void> {
  if (verificationCode) {
    const { error } = await supabase
      .from("class_exams")
      .update({ status: "active", verification_code: verificationCode })
      .eq("id", classExamId);
    if (error) throw error;
    return;
  }

  const { data, error: fetchError } = await supabase
    .from("class_exams")
    .select("verification_code")
    .eq("id", classExamId)
    .single();

  if (fetchError || !data) throw fetchError ?? new Error("Class attachment not found.");

  if (!data.verification_code) {
    throw new Error(SESSION_CODE_REQUIRED_MESSAGE);
  }

  const { error } = await supabase
    .from("class_exams")
    .update({ status: "active" })
    .eq("id", classExamId);
  if (error) throw error;
}

export async function endClassExam(classExamId: string): Promise<void> {
  const { error } = await supabase
    .from("class_exams")
    .update({ status: "ended" })
    .eq("id", classExamId);
  if (error) throw error;
}

// edits settings on an existing attachment — verification code can only change
// before it goes live, mirroring the old exams-level rule 1:1
export async function updateClassExamSettings(
  classExamId: string,
  settings: {
    durationMinutes: number;
    maxAttempts: number;
    passMark: number | null;
    randomizeOrder: boolean;
    verificationCode?: string;
    startsAt: string | null;
    endsAt: string | null;
  },
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    duration_minutes: settings.durationMinutes,
    max_attempts: settings.maxAttempts,
    pass_mark: settings.passMark,
    randomize_order: settings.randomizeOrder,
    starts_at: settings.startsAt,
    ends_at: settings.endsAt,
  };

  if (settings.verificationCode !== undefined) {
    const { data: row, error: statusError } = await supabase
      .from("class_exams")
      .select("status")
      .eq("id", classExamId)
      .single();

    if (statusError || !row) throw statusError ?? new Error("Class attachment not found.");

    if (row.status !== "scheduled") {
      throw new Error("Session code can only be changed before this class goes live.");
    }

    updatePayload.verification_code = settings.verificationCode;
  }

  const { error } = await supabase
    .from("class_exams")
    .update(updatePayload)
    .eq("id", classExamId);
  if (error) throw error;
}

// removes an attachment outright — only sensible while still 'scheduled';
// once active/ended it's tied to real sessions and should be ended, not deleted
export async function removeClassExamAttachment(classExamId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("class_exams")
    .select("status")
    .eq("id", classExamId)
    .single();

  if (fetchError || !data) throw fetchError ?? new Error("Class attachment not found.");

  if (data.status !== "scheduled") {
    throw new Error("Only a class that hasn't gone live can be removed. End it instead.");
  }

  const { error } = await supabase.from("class_exams").delete().eq("id", classExamId);
  if (error) throw error;
}