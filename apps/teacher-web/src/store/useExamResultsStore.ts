import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ExamResultState {
  currentClassExamId: string | null; // one exam as delivered to one class
  setCurrentClassExamId: (classExamId: string | null) => void;
}

export const useExamResultsStore = create<ExamResultState>()(persist((set) => ({
  currentClassExamId: null,
  setCurrentClassExamId: (classExamId) => set({ currentClassExamId: classExamId }),
}), {
  name: "contx-exam-results",
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ currentClassExamId: state.currentClassExamId }),
}));
