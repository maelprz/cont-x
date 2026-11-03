import { create } from "zustand";

// shape of the store: one id, one way to change it
interface ViolationMonitoringState {
  currentClassExamId: string | null; // which exam, as delivered to one class, is being monitored
  setCurrentClassExamId: (classExamId: string | null) => void; // updates which class exam is active
}

// tracks which class exam's attempts and violations are being viewed right now
export const useViolationMonitoringStore = create<ViolationMonitoringState>(
  (set) => ({
    currentClassExamId: null, // nothing selected until a class exam is clicked
    setCurrentClassExamId: (classExamId) => set({ currentClassExamId: classExamId }), // overwrites the current selection
  }),
);