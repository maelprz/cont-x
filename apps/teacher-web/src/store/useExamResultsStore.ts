import { create } from "zustand";

interface ExamResultState {
  currentExamId: string | null;
  setCurrentExamId: (examId: string | null) => void;
}

export const useExamResultsStore = create<ExamResultState>((set) => ({
  currentExamId: null,
  setCurrentExamId: (examId) => set({ currentExamId: examId }),
}));
