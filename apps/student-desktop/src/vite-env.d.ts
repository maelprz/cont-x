/// <reference types="vite/client" />
interface Window {
  ipcRenderer: {
    runLocalCode: (key: import('./types/offlineExam').OfflineAttemptKey, questionId: string, code: string, visibleOnly: boolean, operationId?: string) => Promise<import('./services/codeExecutionService').RunOutcome>;
    gradeLocalSubmission: (key: import('./types/offlineExam').OfflineAttemptKey, status: 'submitted' | 'timed_out', answers: import('./services/examService').SubmittedAnswer[], requestedAt?: string) => Promise<import('./types/localGrading').LocalSubmission>;
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
    saveOfflineDraft: (key: import("./types/offlineExam").OfflineAttemptKey, draft: import("./types/offlineExam").OfflineExamDraft) => Promise<void>;
    enqueueOfflineOperation: (key: import("./types/offlineExam").OfflineAttemptKey, operation: import("./types/offlineExam").OfflineOperation) => Promise<void>;
    listOfflineOperations: (key: import("./types/offlineExam").OfflineAttemptKey) => Promise<import("./types/offlineExam").OfflineOperation[]>;
    acknowledgeOfflineOperation: (key: import("./types/offlineExam").OfflineAttemptKey, operation: import("./types/offlineExam").OfflineOperation) => Promise<void>;
    onViolation: (callback: (payload: import("./types/violationEvent").ViolationEvent) => void) => () => void;
  };
}
