import { runAllTestsAndScore, type RunOutcome } from "./codeExecutionService";
import { getSessionTiming } from "./examService";
import { supabase } from "./supabaseClient";
import { logKeystrokeBatch } from "./keystrokeService";
import { reportLiveState } from "./liveStateService";
import { insertMovementEvents } from "./movementEventService";
import { logViolation } from "./violationService";
import type { OfflineExamSnapshot, OfflineOperation } from "../types/offlineExam";

export type OfflineSyncOutcome = "result" | "removed" | "extended";

export async function syncOfflineAttempt(
  exam: OfflineExamSnapshot,
  operations: OfflineOperation[],
  onGraded: (id: string, result: RunOutcome) => void,
): Promise<OfflineSyncOutcome | undefined> {
  const timing = await getSessionTiming(exam.sessionId, AbortSignal.timeout(8_000));
  if (timing.sessionStatus === "removed") return "removed";
  if (timing.sessionStatus === "submitted" || timing.sessionStatus === "timed_out") return "result";
  if (timing.sessionStatus !== "in_progress") throw new Error("Exam status could not be reconciled.");
  const key = { studentId: exam.studentId, sessionId: exam.sessionId };

  for (const operation of operations) {
    if (!navigator.onLine) return;
    if (operation.kind === "submit") {
      if (operation.submission.status === "timed_out" && !timing.forceSubmit) {
        await window.ipcRenderer.acknowledgeOfflineOperation(key, operation);
        return "extended";
      }
      // The submit RPC locks the attempt and uses server timing for the official outcome.
      const { error } = await supabase.rpc("submit_offline_exam_session", {
        p_operation_id: operation.id,
        p_session_id: exam.sessionId,
        p_requested_at: operation.occurredAt,
        p_status: operation.submission.status,
        p_answers: operation.submission.answers,
      }).abortSignal(AbortSignal.timeout(15_000));
      if (error) throw error;
      return "result";
    }

    await uploadOperation(exam, operation, onGraded);
    await window.ipcRenderer.acknowledgeOfflineOperation(key, operation);
  }
}

async function uploadOperation(
  exam: OfflineExamSnapshot,
  operation: Exclude<OfflineOperation, { kind: "submit" }>,
  onGraded: (id: string, result: RunOutcome) => void,
): Promise<void> {
  let saved: boolean;
  switch (operation.kind) {
    case "movement":
      saved = await insertMovementEvents(exam.sessionId, [{ ...operation.event, id: operation.id }]) === "ok";
      break;
    case "violation":
      saved = await logViolation(exam.sessionId, operation.event, operation.questionId, operation.id);
      break;
    case "keystrokes":
      saved = await logKeystrokeBatch(exam.sessionId, operation.id, operation.question,
        operation.batch, operation.occurredAt);
      break;
    case "live":
      saved = await reportLiveState(exam.sessionId, operation.state);
      break;
    case "graded": {
      const question = exam.questions.find((item) =>
        operation.poolDrawId ? item.poolDrawId === operation.poolDrawId : item.id === operation.questionId);
      if (question?.type !== "coding") throw new Error("Queued coding question is unavailable.");
      const result = await runAllTestsAndScore(exam.sessionId, question.id, operation.code,
        question.programType ?? "cProgram", question.mainCode ?? undefined, question.maxPoints,
        question.checkPenaltyPerAttempt ?? 0, Boolean(question.poolDrawId), operation);
      onGraded(operation.id, result);
      return;
    }
  }
  if (!saved) throw new Error("An exam activity upload is still pending.");
}
