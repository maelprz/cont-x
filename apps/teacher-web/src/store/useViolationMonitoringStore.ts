import { create } from "zustand"; // store library
import { persist, createJSONStorage } from "zustand/middleware"; // browser storage helpers

interface ViolationMonitoringState {
  currentClassExamId: string | null; // which exam, as delivered to one class, is being monitored
  returnScreen: "dashboard" | "examLibrary";
  setCurrentClassExamId: (classExamId: string | null, returnScreen?: ViolationMonitoringState["returnScreen"]) => void;
}

export const useViolationMonitoringStore = create<ViolationMonitoringState>()(
  persist(
    (set) => ({
      currentClassExamId: null, // nothing selected until a class exam is clicked
      returnScreen: "examLibrary",
      setCurrentClassExamId: (classExamId, returnScreen = "examLibrary") => set({ currentClassExamId: classExamId, returnScreen }),
    }),
    {
      name: "contx-class-exam", // sessionStorage key
      storage: createJSONStorage(() => sessionStorage), // survives refresh, not a closed tab
      partialize: (state) => ({ currentClassExamId: state.currentClassExamId, returnScreen: state.returnScreen }),
    },
  ),
);
