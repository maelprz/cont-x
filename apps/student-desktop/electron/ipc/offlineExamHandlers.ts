import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { gradeLocalSubmission, runLocalCode } from '../localGradingService';
import type { SubmittedAnswer } from '../../src/services/examService';
import type { OfflineAttemptKey, OfflineExamDraft, OfflineExamSnapshot, OfflineOperation } from "../../src/types/offlineExam";
import { acknowledgeOfflineOperation, checkOfflineExamStorage, deleteOfflineExam, enqueueOfflineOperation, listOfflineOperations, loadOfflineExam, saveOfflineDraft, saveOfflineExam, updateOfflineTiming } from "../storage/offlineExamStorage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerOfflineExamHandlers(getWindow: () => BrowserWindow | null): void {
  function checkSender(event: IpcMainInvokeEvent): void {
    const window = getWindow();
    if (!window || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error("Local exam storage is unavailable.");
    }
  }

  function checkAttempt(event: IpcMainInvokeEvent, key: OfflineAttemptKey): void {
    checkSender(event);
    if (typeof key?.studentId !== "string" || !UUID.test(key.studentId) ||
        typeof key.sessionId !== "string" || !UUID.test(key.sessionId)) {
      throw new Error("Invalid offline attempt.");
    }
  }

  ipcMain.handle("check-offline-exam-storage", async (event) => {
    checkSender(event);
    try {
      await checkOfflineExamStorage();
      return true;
    } catch (error) {
      console.error("[offline exam] storage preflight failed", error instanceof Error ? error.name : "");
      throw new Error("Local exam storage is unavailable. Ask your exam administrator for help.");
    }
  });

  ipcMain.handle("save-offline-exam", async (event, snapshot: OfflineExamSnapshot) => {
    checkAttempt(event, snapshot);
    if (
      !Array.isArray(snapshot.questions) || snapshot.questions.length === 0 ||
      !snapshot.rules || !snapshot.timing || !Number.isFinite(snapshot.timingReceivedAt)
    ) {
      throw new Error("The downloaded exam is incomplete.");
    }

    try {
      await saveOfflineExam(snapshot);
    } catch (error) {
      console.error("[offline exam] storage save failed", error instanceof Error ? error.name : "");
      throw new Error("Could not save the exam to local storage. Try again.");
    }
  });

  ipcMain.handle("load-offline-exam", async (event, key: OfflineAttemptKey) => {
    checkAttempt(event, key);
    await checkOfflineExamStorage();
    return loadOfflineExam(key);
  });
  ipcMain.handle("update-offline-timing", (event, key: OfflineAttemptKey, timing: OfflineExamSnapshot["timing"], receivedAt: number) => {
    checkAttempt(event, key);
    if (!timing || !Number.isFinite(receivedAt)) throw new Error("Invalid exam timing.");
    return updateOfflineTiming(key, timing, receivedAt);
  });
  ipcMain.handle("delete-offline-exam", (event, key: OfflineAttemptKey) => {
    checkAttempt(event, key);
    return deleteOfflineExam(key);
  });
  ipcMain.handle('run-local-code', (event, key: OfflineAttemptKey, questionId: string, code: string, visibleOnly: boolean, operationId?: string) => {
    checkAttempt(event, key);
    if (typeof questionId !== 'string' || typeof code !== 'string' || typeof visibleOnly !== 'boolean') throw new Error('Invalid coding request.');
    if (operationId !== undefined && (visibleOnly || !UUID.test(operationId))) throw new Error('Invalid coding operation.');
    return runLocalCode(key, questionId, code, visibleOnly, operationId);
  });
  ipcMain.handle('grade-local-submission', (event, key: OfflineAttemptKey, status: 'submitted' | 'timed_out', answers: SubmittedAnswer[], requestedAt?: string) => {
    checkAttempt(event, key);
    if (!['submitted', 'timed_out'].includes(status) || !Array.isArray(answers) || answers.some((answer) =>
      !answer || typeof answer.answer_text !== 'string' ||
      (answer.change_count !== undefined && (!Number.isFinite(answer.change_count) || answer.change_count < 0)) ||
      (answer.time_spent_seconds !== undefined && (!Number.isFinite(answer.time_spent_seconds) || answer.time_spent_seconds < 0)) ||
      (answer.answered_at != null && !Number.isFinite(Date.parse(answer.answered_at))))) throw new Error('Invalid submission.');
    if (requestedAt !== undefined && !Number.isFinite(Date.parse(requestedAt))) throw new Error('Invalid submission time.');
    return gradeLocalSubmission(key, status, answers, requestedAt);
  });
  ipcMain.handle("save-offline-draft", (event, key: OfflineAttemptKey, draft: OfflineExamDraft) => {
    checkAttempt(event, key);
    return saveOfflineDraft(key, draft);
  });
  ipcMain.handle("enqueue-offline-operation", (event, key: OfflineAttemptKey, operation: OfflineOperation) => {
    checkAttempt(event, key);
    if (!UUID.test(operation?.id) || !Number.isFinite(Date.parse(operation.occurredAt))) {
      throw new Error("Invalid offline operation.");
    }
    return enqueueOfflineOperation(key, operation);
  });
  ipcMain.handle("list-offline-operations", (event, key: OfflineAttemptKey) => {
    checkAttempt(event, key);
    return listOfflineOperations(key);
  });
  ipcMain.handle("acknowledge-offline-operation", (event, key: OfflineAttemptKey, operation: OfflineOperation) => {
    checkAttempt(event, key);
    if (!UUID.test(operation?.id) || !Number.isFinite(Date.parse(operation.occurredAt))) {
      throw new Error("Invalid offline operation.");
    }
    return acknowledgeOfflineOperation(key, operation);
  });
}
