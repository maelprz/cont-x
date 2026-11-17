import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import type { OfflineExamSnapshot } from "../../src/types/offlineExam";
import { checkOfflineExamStorage, saveOfflineExam } from "../storage/offlineExamStorage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerOfflineExamHandlers(getWindow: () => BrowserWindow | null): void {
  function checkSender(event: IpcMainInvokeEvent): void {
    const window = getWindow();
    if (!window || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error("Local exam storage is unavailable.");
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
    checkSender(event);
    if (
      typeof snapshot?.studentId !== "string" || !UUID.test(snapshot.studentId) ||
      typeof snapshot.sessionId !== "string" || !UUID.test(snapshot.sessionId) ||
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
}
