import { getSessionQuestions, getSessionRules, getSessionTiming } from "./examService";
import { supabase } from './supabaseClient';
import type { AuthUser } from "./authService";
import type { OfflineExamSnapshot, OfflineAttemptKey } from "../types/offlineExam";

const resumeKey = "contx-active-offline-attempt";

export function rememberOfflineAttempt(user: AuthUser, sessionId: string) {
  localStorage.setItem(resumeKey, JSON.stringify({ user, sessionId }));
}

export function getOfflineResumeIdentity(): { user: AuthUser; sessionId: string } | null {
  try {
    const data = JSON.parse(localStorage.getItem(resumeKey) ?? "null");
    return data?.user?.role === "student" && typeof data.sessionId === "string" ? data : null;
  } catch {
    return null;
  }
}

export function forgetOfflineAttempt(key?: OfflineAttemptKey) {
  const active = getOfflineResumeIdentity();
  if (!key || (active?.user.id === key.studentId && active.sessionId === key.sessionId)) {
    localStorage.removeItem(resumeKey);
  }
}

export async function prepareOfflineExam(
  studentId: string,
  sessionId: string,
  classExamId: string,
  exam: { id: string | null; title: string | null },
): Promise<OfflineExamSnapshot> {
  const [questions, rules, { timing, timingReceivedAt }] = await Promise.all([
    getSessionQuestions(sessionId),
    getSessionRules(sessionId),
    getSessionTiming(sessionId).then((timing) => ({ timing, timingReceivedAt: Date.now() })),
  ]);

  if (
    questions.length === 0 ||
    timing.classExamId !== classExamId ||
    ![timing.serverNow, timing.normalDeadline, timing.hardDeadline].every((value) =>
      Number.isFinite(Date.parse(value)),
    )
  ) {
    throw new Error("The exam download is incomplete. Try again.");
  }

  if (timing.sessionStatus !== "in_progress" || timing.forceSubmit) {
    throw new Error("This exam attempt is no longer active.");
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Reconnect and sign in to download the exam.');
  return window.ipcRenderer.prepareOfflineExam({
    studentId, sessionId, examId: exam.id ?? undefined, title: exam.title ?? undefined,
    questions, rules, timing, timingReceivedAt,
  }, session.access_token);
}

export function finishOfflineExam(key: OfflineAttemptKey): void {
  void window.ipcRenderer.deleteOfflineExam(key).then(() => forgetOfflineAttempt(key)).catch(() => {
    console.warn("Could not remove the completed offline exam from local storage.");
  });
}
