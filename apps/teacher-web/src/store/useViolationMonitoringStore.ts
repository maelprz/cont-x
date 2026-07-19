import { create } from "zustand";

// shape of the store: one id, one way to change it
interface ViolationMonitoringState {
  currentExamId: string | null; // which exam is being monitored, if any
  setCurrentExamId: (examId: string | null) => void; // updates which exam is active
}

// tracks which exam's violations are being viewed right now
export const useViolationMonitoringStore = create<ViolationMonitoringState>(
  (set) => ({
    currentExamId: null, // nothing selected until a card is clicked
    setCurrentExamId: (examId) => set({ currentExamId: examId }), // overwrites the current selection
  }),
);
