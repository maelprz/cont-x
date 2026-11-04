import { create } from "zustand";

// Shape of the exam data carried from Dashboard to Confirmation.
interface ExamSessionState {
  examId: string | null; // exams.id — used by the RPC call on Confirmation
  examTitle: string | null;
  examStatus: string | null;
  attemptsRemaining: number | null;
  sessionId: string | null;
  setExam: (exam: {
    id: string;
    title: string;
    status: string;
    attemptsRemaining: number;
  }) => void; // called by Dashboard
  setSessionId: (sessionId: string) => void; // called by Confirmation after success
  removed: boolean;
  markRemoved: () => void;
  reset: () => void; // clears everything — call this on logout
}

export const useExamSessionStore = create<ExamSessionState>((set) => ({
  examId: null, // nothing loaded yet
  examTitle: null,
  examStatus: null,
  attemptsRemaining: null,
  sessionId: null,
  setExam: (exam) =>
    set({
      examId: exam.id, // save the id for the RPC call later
      examTitle: exam.title, // save the title to display
      examStatus: exam.status, // save status in case it's needed
      attemptsRemaining: exam.attemptsRemaining, // save for the Attempts Left card
    }),
  setSessionId: (sessionId) => set({ sessionId }), // save the new session's id
  removed: false,
  markRemoved: () => set({ removed: true }),
  reset: () =>
    set({
      examId: null,
      examTitle: null,
      examStatus: null,
      attemptsRemaining: null,
      sessionId: null,
      removed: false,
    }), // wipe on logout
}));
