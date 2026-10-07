import { create } from "zustand";

interface ExamBuilderState {
  currentExamId: string | null; // which exam is being edited, if any
  setCurrentExamId: (id: string | null) => void; // updates which exam is active
  openedFromEditExam: boolean;
  setOpenedFromEditExam: (value: boolean) => void;
}

export const useExamBuilderStore = create<ExamBuilderState>((set) => ({
  currentExamId: null, // nothing selected until a new/existing exam is opened
  setCurrentExamId: (id: string | null) => set({ currentExamId: id }),
  openedFromEditExam: false,
  setOpenedFromEditExam: (value: boolean) => set({ openedFromEditExam: value }),
}));