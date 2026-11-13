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
    .eq("subject_id", examRow.subject_id)
    .is("archived_at", null); // an archived class can't take new exams

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("name");
  if (error) throw error;

  return data ?? [];
}

// what happens to answers saved after the time limit: kept as normal, or scored zero

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
  displayAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  allowOvertime: boolean; // false (default): time-up submits the attempt automatically. true: students may keep going
  overtimeMinutes: number;
  overtimeDeduction: number;
  sequential: boolean; // true: questions must be answered in order, no skipping ahead
  allowReview: boolean; // true: students can view their answers after the exam
  answerChangeDeduction: number; // points lost each time a student changes an answer they already gave; 0 means off
}

// The session (verification) code is kept in class_exam_secrets, which only the class's teacher
// can read. It used to be a column on class_exams, which students could read.
async function readSessionCode(classExamId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("class_exam_secrets")
    .select("verification_code")
    .eq("class_exam_id", classExamId)
    .maybeSingle();
  if (error) throw error;
  return data?.verification_code ?? null;
}

// saves the code, or clears it when it is blank
async function writeSessionCode(classExamId: string, code: string): Promise<void> {
  const trimmed = code.trim();
  if (trimmed === "") {
    const { error } = await supabase.from("class_exam_secrets").delete().eq("class_exam_id", classExamId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("class_exam_secrets")
    .upsert({ class_exam_id: classExamId, verification_code: trimmed, updated_at: new Date().toISOString() });
  if (error) throw error;
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
      starts_at,
      display_at,
      ends_at,
      ended_at,
      allow_overtime,
      overtime_minutes,
      overtime_deduction,
      sequential,
      allow_review,
      answer_change_deduction,
      classes(name)
    `,
    )
    .eq("id", classExamId)
    .single();

  if (error || !data) throw error ?? new Error("Class attachment not found.");

  // the session code lives in its own teacher-only table, not on class_exams
  const sessionCode = await readSessionCode(classExamId);

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
    verificationCode: sessionCode,
    startsAt: data.starts_at,
    displayAt: data.display_at,
    endsAt: data.ends_at,
    endedAt: data.ended_at,
    allowOvertime: data.allow_overtime ?? false,
    overtimeMinutes: data.overtime_minutes,
    overtimeDeduction: Number(data.overtime_deduction),
    sequential: data.sequential,
    allowReview: data.allow_review,
    answerChangeDeduction: Number(data.answer_change_deduction),
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
      starts_at: settings.startsAt,
      ends_at: settings.endsAt,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Could not add this exam to the class.");
  if (settings.verificationCode) await writeSessionCode(data.id, settings.verificationCode);
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
): Promise<string> {
  if (verificationCode) {
    await writeSessionCode(classExamId, verificationCode); // the code first, so a live exam always has one
    const { error } = await supabase
      .from("class_exams")
      .update({ status: "active" })
      .eq("id", classExamId);
    if (error) throw error;
    return verificationCode.trim();
  }

  const sessionCode = await readSessionCode(classExamId);
  if (!sessionCode) {
    throw new Error(SESSION_CODE_REQUIRED_MESSAGE);
  }

  const { error } = await supabase
    .from("class_exams")
    .update({ status: "active" })
    .eq("id", classExamId);
  if (error) throw error;
  return sessionCode;
}

export async function endClassExam(classExamId: string): Promise<void> {
  const { error } = await supabase
    .from("class_exams")
    .update({ status: "ended", end_reason: "manual" })
    .eq("id", classExamId);
  if (error) throw error;
}

export async function reopenClassExam(
  classExamId: string,
  endedAt: string | null,
  windowMinutes: number,
  sessionCode: string | null,
): Promise<{ endsAt: string; sessionCode: string }> {
  const { data, error } = await supabase.rpc("reopen_class_exam", {
    p_class_exam_id: classExamId,
    p_expected_ended_at: endedAt,
    p_window_minutes: windowMinutes,
    p_session_code: sessionCode,
  });
  if (error) throw new Error(error.message);
  return { endsAt: data.endsAt, sessionCode: data.sessionCode };
}

// edits settings on an existing attachment — verification code can only change
// before it goes live, mirroring the old exams-level rule 1:1
export type UpdateClassExamSettings = {
  durationMinutes: number;
  maxAttempts: number;
  passMark: number | null;
  randomizeOrder: boolean;
  verificationCode?: string;
  startsAt: string | null;
  displayAt: string | null;
  endsAt: string | null;
  allowOvertime: boolean;
  overtimeMinutes: number;
  overtimeDeduction: number;
  sequential: boolean;
  allowReview: boolean;
  answerChangeDeduction: number;
};

export async function updateClassExamSettings(
  classExamId: string,
  settings: UpdateClassExamSettings,
): Promise<void> {
  if (!Number.isInteger(settings.durationMinutes) || settings.durationMinutes <= 0) throw new Error("Duration must be a positive whole number of minutes.");
  if (settings.allowOvertime && (!Number.isInteger(settings.overtimeMinutes) || settings.overtimeMinutes <= 0 || !Number.isFinite(settings.overtimeDeduction) || settings.overtimeDeduction < 0)) throw new Error("Enter positive whole overtime minutes and a deduction of 0 or more.");
  if (settings.startsAt && settings.endsAt && settings.startsAt >= settings.endsAt) throw new Error("End time must be after start time.");
  if (settings.displayAt && settings.startsAt && settings.displayAt > settings.startsAt) throw new Error("Display time must be at or before start time.");
  const updatePayload: Record<string, unknown> = {
    duration_minutes: settings.durationMinutes,
    max_attempts: settings.maxAttempts,
    pass_mark: settings.passMark,
    randomize_order: settings.randomizeOrder,
    starts_at: settings.startsAt,
    display_at: settings.displayAt,
    ends_at: settings.endsAt,
    allow_overtime: settings.allowOvertime,
    overtime_minutes: settings.allowOvertime ? settings.overtimeMinutes : 0,
    overtime_deduction: settings.allowOvertime ? settings.overtimeDeduction : 0,
    sequential: settings.sequential,
    allow_review: settings.allowReview,
    answer_change_deduction: settings.answerChangeDeduction,
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

  }

  const { error } = await supabase
    .from("class_exams")
    .update(updatePayload)
    .eq("id", classExamId);
  if (error) throw error;

  if (settings.verificationCode !== undefined) {
    await writeSessionCode(classExamId, settings.verificationCode);
  }
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
