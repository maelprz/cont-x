import { ipcRenderer, contextBridge } from "electron";
import type { ViolationEvent } from "../src/types/violationEvent";
import type { OfflineAttemptKey, OfflineExamSnapshot } from "../src/types/offlineExam";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  invoke(channel: string, payload: unknown) {
    if (channel !== "run-test-cases") throw new Error("IPC channel is not allowed.");
    return ipcRenderer.invoke(channel, payload);
  },
  onViolation: (
    callback: (payload: ViolationEvent) => void,
  ) => {
    const listener = (
      _event: unknown,
      payload: ViolationEvent,
    ) => callback(payload);
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
  saveOfflineExam: (snapshot: OfflineExamSnapshot): Promise<void> =>
    ipcRenderer.invoke("save-offline-exam", snapshot),
  loadOfflineExam: (key: OfflineAttemptKey): Promise<OfflineExamSnapshot | null> =>
    ipcRenderer.invoke("load-offline-exam", key),
  updateOfflineTiming: (key: OfflineAttemptKey, timing: OfflineExamSnapshot["timing"], receivedAt: number): Promise<void> =>
    ipcRenderer.invoke("update-offline-timing", key, timing, receivedAt),
  deleteOfflineExam: (key: OfflineAttemptKey): Promise<void> =>
    ipcRenderer.invoke("delete-offline-exam", key),
});
