import { create } from "zustand";

interface QuestionBankState {
  // which sub-question bank (subject) is open — null means the sub-bank list
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  // The Question Bank screen registers this while it's mounted. The sidebar calls it
  // when "Question Bank" is clicked while already on the screen, so the screen can go
  // back to the subject list itself — it may be mid-edit and needs to ask about unsaved
  // changes first. null when the screen isn't showing.
  resetHandler: (() => void) | null;
  setResetHandler: (handler: (() => void) | null) => void;
}

export const useQuestionBankStore = create<QuestionBankState>((set) => ({
  selectedSubjectId: null,
  setSelectedSubjectId: (id: string | null) => set({ selectedSubjectId: id }),
  resetHandler: null,
  setResetHandler: (handler) => set({ resetHandler: handler }),
}));