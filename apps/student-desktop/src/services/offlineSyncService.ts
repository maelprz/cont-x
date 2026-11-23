import { getSessionTiming, syncLocalExamSubmission } from "./examService";
import { logKeystrokeBatch } from "./keystrokeService";
import { reportLiveState } from "./liveStateService";
import { insertMovementEvents } from "./movementEventService";
import { logViolation } from "./violationService";
import type { OfflineExamSnapshot, OfflineOperation, OfflineSubmission } from "../types/offlineExam";
import type { LocalSubmission } from "../types/localGrading";

export type OfflineSyncOutcome = "result" | "removed" | "extended";

export async function prepareLocalSync(
  exam: OfflineExamSnapshot,
  pending: OfflineSubmission | undefined,
  receipt: LocalSubmission | null,
) {
  const key = { studentId: exam.studentId, sessionId: exam.sessionId };
  const ipc = window.ipcRenderer;
  let operations = await ipc.listOfflineOperations(key);
  let gradedRuns = operations.filter((operation) => operation.kind === "graded");
  while (gradedRuns.length) {
    for (const operation of gradedRuns) {
      const questionId = operation.poolDrawId ?? operation.questionId;
      if (!questionId) throw new Error("Queued coding question is unavailable.");
      await ipc.runLocalCode(key, questionId, operation.code, false, operation.id);
      await ipc.acknowledgeOfflineOperation(key, operation);
    }
    operations = await ipc.listOfflineOperations(key);
    gradedRuns = operations.filter((operation) => operation.kind === "graded");
  }
  if (pending && (!receipt || receipt.provisional)) {
    receipt = await ipc.gradeLocalSubmission(key, pending.status, pending.answers, pending.requestedAt);
  }
  return { operations, receipt };
}

export async function syncOfflineAttempt(
  exam: OfflineExamSnapshot,
  operations: OfflineOperation[],
  graded: LocalSubmission | null,
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
      if (!graded) throw new Error("The local grade is still pending.");
      await syncLocalExamSubmission(exam.sessionId, graded, AbortSignal.timeout(15_000));
      return "result";
    }

    if (operation.kind === "graded") throw new Error("Local coding runs are still pending.");
    await uploadOperation(exam, operation);
    await window.ipcRenderer.acknowledgeOfflineOperation(key, operation);
  }
}

async function uploadOperation(
  exam: OfflineExamSnapshot,
  operation: Exclude<OfflineOperation, { kind: "submit" | "graded" }>,
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
  }
  if (!saved) throw new Error("An exam activity upload is still pending.");
}
