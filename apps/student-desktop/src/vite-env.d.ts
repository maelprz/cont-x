/// <reference types="vite/client" />
interface Window {
  ipcRenderer: {
    on: (...args: any[]) => any;
    off: (...args: any[]) => any;
    send: (...args: any[]) => any;
    invoke: (...args: any[]) => any;
    exitApp: () => void; // sends 'exit-app' to the main process on logout
    setExamProcessMonitoring: (enabled: boolean) => void;
    checkExamApps: (closeApps: boolean) => Promise<string[]>;
    endExamAppCheck: () => void;
    checkOfflineExamStorage: () => Promise<boolean>;
    saveOfflineExam: (snapshot: import("./types/offlineExam").OfflineExamSnapshot) => Promise<void>;
    onViolation: (callback: (payload: import("./types/violationEvent").ViolationEvent) => void) => () => void;
  };
}
