import { create } from "zustand";

interface QuestionBankState {
  // which sub-question bank (subject) is open — null means the sub-bank list
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
}

export const useQuestionBankStore = create<QuestionBankState>((set) => ({
  selectedSubjectId: null,
  setSelectedSubjectId: (id: string | null) => set({ selectedSubjectId: id }),
}));