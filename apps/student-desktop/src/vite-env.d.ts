/// <reference types="vite/client" />
interface Window {
  ipcRenderer: {
    invoke: (...args: any[]) => any;
    exitApp: () => void; // sends 'exit-app' to the main process on logout
    setExamProcessMonitoring: (enabled: boolean) => void;
    checkExamApps: (closeApps: boolean) => Promise<string[]>;
    endExamAppCheck: () => void;
    checkOfflineExamStorage: () => Promise<boolean>;
    saveOfflineExam: (snapshot: import("./types/offlineExam").OfflineExamSnapshot) => Promise<void>;
    loadOfflineExam: (key: import("./types/offlineExam").OfflineAttemptKey) => Promise<import("./types/offlineExam").OfflineExamSnapshot | null>;
    updateOfflineTiming: (key: import("./types/offlineExam").OfflineAttemptKey, timing: import("./services/examService").SessionTiming, receivedAt: number) => Promise<void>;
    deleteOfflineExam: (key: import("./types/offlineExam").OfflineAttemptKey) => Promise<void>;
    onViolation: (callback: (payload: import("./types/violationEvent").ViolationEvent) => void) => () => void;
  };
}
