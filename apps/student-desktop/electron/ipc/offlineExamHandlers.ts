import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import type { OfflineAttemptKey, OfflineExamSnapshot } from "../../src/types/offlineExam";
import { checkOfflineExamStorage, deleteOfflineExam, loadOfflineExam, saveOfflineExam, updateOfflineTiming } from "../storage/offlineExamStorage";

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
      return await checkOfflineExamStorage();
    } catch (error) {
      console.error("[offline exam] MySQL preflight failed", error instanceof Error ? error.name : "");
      throw new Error("Local MySQL storage is unavailable. Ask your exam administrator for help.");
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
      console.error("[offline exam] MySQL save failed", error instanceof Error ? error.name : "");
      throw new Error("Could not save the exam to local MySQL storage. Try again.");
    }
  });

  ipcMain.handle("load-offline-exam", async (event, key: OfflineAttemptKey) => {
    checkAttempt(event, key);
    return await checkOfflineExamStorage() ? loadOfflineExam(key) : null;
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
}
