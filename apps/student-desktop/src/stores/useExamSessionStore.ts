import { create } from "zustand"; // same state library used by useAuthStore/routerLogic

// Shape of the exam data carried from Dashboard to Confirmation.
interface ExamSessionState {
  examId: string | null; // exams.id — used by the RPC call on Confirmation
  examTitle: string | null; // shown on the Confirmation screen's header
  examStatus: string | null; // carried along in case Confirmation needs it later
  sessionId: string | null; // filled in only after verification succeeds
  setExam: (exam: { id: string; title: string; status: string }) => void; // called by Dashboard
  setSessionId: (sessionId: string) => void; // called by Confirmation after success
  reset: () => void; // clears everything — call this on logout
}

export const useExamSessionStore = create<ExamSessionState>((set) => ({
  examId: null, // nothing loaded yet
  examTitle: null,
  examStatus: null,
  sessionId: null,
  setExam: (exam) =>
    set({
      examId: exam.id, // save the id for the RPC call later
      examTitle: exam.title, // save the title to display
      examStatus: exam.status, // save status in case it's needed
    }),
  setSessionId: (sessionId) => set({ sessionId }), // save the new session's id
  reset: () =>
    set({ examId: null, examTitle: null, examStatus: null, sessionId: null }), // wipe on logout
}));