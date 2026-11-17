import { getSessionQuestions, getSessionRules, getSessionTiming } from "./examService";
import type { OfflineExamSnapshot } from "../types/offlineExam";

export async function prepareOfflineExam(
  studentId: string,
  sessionId: string,
  classExamId: string,
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

  if (timing.sessionStatus !== "in_progress") {
    throw new Error("This exam attempt is no longer active.");
  }

  const snapshot = { studentId, sessionId, questions, rules, timing, timingReceivedAt };
  try {
    await window.ipcRenderer.saveOfflineExam(snapshot);
  } catch {
    throw new Error("Could not save the exam to local MySQL storage. Try again.");
  }
  return snapshot;
}
