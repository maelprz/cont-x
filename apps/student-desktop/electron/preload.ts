import { ipcRenderer, contextBridge } from "electron";
import type { ViolationEvent } from "../src/types/violationEvent";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
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
});
