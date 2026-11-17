import { create } from "zustand";
import type { OfflineExamSnapshot } from "../types/offlineExam";

// Shape of the exam data carried from Dashboard to Confirmation.
interface ExamSessionState {
  examId: string | null; // exams.id, used to load the exam's questions
  classExamId: string | null; // class_exams.id, used for the verify RPC, duration and pass mark
  examTitle: string | null;
  examStatus: string | null;
  attemptsRemaining: number | null;
  sessionId: string | null;
  offlineExam: OfflineExamSnapshot | null;
  restoredOffline: boolean;
  restoreOfflineExam: (exam: OfflineExamSnapshot) => void;
  setExam: (exam: {
    id: string;
    classExamId: string;
    title: string;
    status?: string; // optional: the exam lookup result does not carry a status
    attemptsRemaining: number;
  }) => void; // called by Dashboard
  setSessionId: (sessionId: string, offlineExam?: OfflineExamSnapshot | null) => void;
  removed: boolean;
  markRemoved: () => void;
  reset: () => void; // clears everything, call this on logout
}

export const useExamSessionStore = create<ExamSessionState>((set) => ({
  examId: null, // nothing loaded yet
  classExamId: null, // nothing loaded yet
  examTitle: null,
  examStatus: null,
  attemptsRemaining: null,
  sessionId: null,
  offlineExam: null,
  restoredOffline: false,
  restoreOfflineExam: (exam) => set({
    examId: exam.examId ?? null,
    classExamId: exam.timing.classExamId,
    examTitle: exam.title ?? "Exam",
    sessionId: exam.sessionId,
    offlineExam: exam,
    restoredOffline: true,
    removed: false,
  }),
  setExam: (exam) =>
    set({
      examId: exam.id, // save the exam id for loading questions
      classExamId: exam.classExamId, // keep the class exam id so Confirmation can send it to the RPC
      examTitle: exam.title, // save the title to display
      examStatus: exam.status ?? null, // status may be missing, so default to null
      attemptsRemaining: exam.attemptsRemaining, // save for the Attempts Left card
    }),
  setSessionId: (sessionId, offlineExam = null) => set({ sessionId, offlineExam, restoredOffline: false }),
  removed: false,
  markRemoved: () => set({ removed: true }),
  reset: () =>
    set({
      examId: null,
      classExamId: null,
      examTitle: null,
      examStatus: null,
      attemptsRemaining: null,
      sessionId: null,
      offlineExam: null,
      restoredOffline: false,
      removed: false,
    }), // wipe on logout
}));
