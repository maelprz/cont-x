import { ipcRenderer, contextBridge } from "electron";
import type { ViolationEvent } from "../src/types/violationEvent";
import type {
  OfflineAttemptKey,
  OfflineExamDraft,
  OfflineExamSnapshot,
  OfflineOperation,
} from "../src/types/offlineExam";
import type { SubmittedAnswer } from "../src/services/examService";
import type { LocalSubmission } from "../src/types/localGrading";
import type { RunOutcome } from "../src/services/codeExecutionService";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  runLocalCode: (
    key: OfflineAttemptKey,
    questionId: string,
    code: string,
    visibleOnly: boolean,
    operationId?: string,
  ): Promise<RunOutcome> =>
    ipcRenderer.invoke("run-local-code", key, questionId, code, visibleOnly, operationId),
  gradeLocalSubmission: (
    key: OfflineAttemptKey,
    status: LocalSubmission["status"],
    answers: SubmittedAnswer[],
    requestedAt?: string,
  ): Promise<LocalSubmission> =>
    ipcRenderer.invoke("grade-local-submission", key, status, answers, requestedAt),
  invoke(channel: string, payload: unknown) {
    if (channel !== "run-test-cases")
      throw new Error("IPC channel is not allowed.");
    return ipcRenderer.invoke(channel, payload);
  },
  onViolation: (callback: (payload: ViolationEvent) => void) => {
    const listener = (_event: unknown, payload: ViolationEvent) =>
      callback(payload);
    ipcRenderer.on("violation-detected", listener);
    return () => ipcRenderer.off("violation-detected", listener); // cleanup for React
  },

  exitApp: () => ipcRenderer.send("exit-app"),
  setExamProcessMonitoring: (enabled: boolean) =>
    ipcRenderer.send("set-exam-process-monitoring", enabled),
  checkExamApps: (closeApps: boolean): Promise<string[]> =>
    ipcRenderer.invoke("check-exam-apps", closeApps),
  endExamAppCheck: () => ipcRenderer.send("end-exam-app-check"),
  checkOfflineExamStorage: (): Promise<boolean> =>
    ipcRenderer.invoke("check-offline-exam-storage"),
  prepareOfflineExam: (snapshot: OfflineExamSnapshot, accessToken: string): Promise<OfflineExamSnapshot> =>
    ipcRenderer.invoke("prepare-offline-exam", snapshot, accessToken),
  loadOfflineExam: (
    key: OfflineAttemptKey,
  ): Promise<OfflineExamSnapshot | null> =>
    ipcRenderer.invoke("load-offline-exam", key),
  updateOfflineTiming: (
    key: OfflineAttemptKey,
    timing: OfflineExamSnapshot["timing"],
    receivedAt: number,
  ): Promise<void> =>
    ipcRenderer.invoke("update-offline-timing", key, timing, receivedAt),
  deleteOfflineExam: (key: OfflineAttemptKey): Promise<void> =>
    ipcRenderer.invoke("delete-offline-exam", key),
  saveOfflineDraft: (
    key: OfflineAttemptKey,
    draft: OfflineExamDraft,
  ): Promise<void> => ipcRenderer.invoke("save-offline-draft", key, draft),
  enqueueOfflineOperation: (
    key: OfflineAttemptKey,
    operation: OfflineOperation,
  ): Promise<void> =>
    ipcRenderer.invoke("enqueue-offline-operation", key, operation),
  listOfflineOperations: (
    key: OfflineAttemptKey,
  ): Promise<OfflineOperation[]> =>
    ipcRenderer.invoke("list-offline-operations", key),
  acknowledgeOfflineOperation: (
    key: OfflineAttemptKey,
    operation: OfflineOperation,
  ): Promise<void> =>
    ipcRenderer.invoke("acknowledge-offline-operation", key, operation),
});
