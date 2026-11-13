import { create } from "zustand"; // store library
import { persist, createJSONStorage } from "zustand/middleware"; // browser storage helpers

interface ViolationMonitoringState {
  currentClassExamId: string | null; // which exam, as delivered to one class, is being monitored
  setCurrentClassExamId: (classExamId: string | null) => void; // updates which class exam is active
}

export const useViolationMonitoringStore = create<ViolationMonitoringState>()(
  persist(
    (set) => ({
      currentClassExamId: null, // nothing selected until a class exam is clicked
      setCurrentClassExamId: (classExamId) => set({ currentClassExamId: classExamId }), // overwrites the current selection
    }),
    {
      name: "contx-class-exam", // sessionStorage key
      storage: createJSONStorage(() => sessionStorage), // survives refresh, not a closed tab
      partialize: (state) => ({ currentClassExamId: state.currentClassExamId }), // only the id is saved
    },
  ),
);