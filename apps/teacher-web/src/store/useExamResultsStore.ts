import { create } from "zustand";

interface ExamResultState {
  currentClassExamId: string | null; // one exam as delivered to one class
  setCurrentClassExamId: (classExamId: string | null) => void;
}

export const useExamResultsStore = create<ExamResultState>((set) => ({
  currentClassExamId: null,
  setCurrentClassExamId: (classExamId) => set({ currentClassExamId: classExamId }),
}));
