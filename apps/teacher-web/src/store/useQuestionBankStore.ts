import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface QuestionBankState {
  editingQuestionId: string | null;
  setEditingQuestionId: (id: string | null) => void;
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

export const useQuestionBankStore = create<QuestionBankState>()(persist((set) => ({
  editingQuestionId: null,
  setEditingQuestionId: (id) => set({ editingQuestionId: id }),
  selectedSubjectId: null,
  setSelectedSubjectId: (id: string | null) => set({ selectedSubjectId: id }),
  resetHandler: null,
  setResetHandler: (handler) => set({ resetHandler: handler }),
}), {
  name: "contx-question-bank",
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ selectedSubjectId: state.selectedSubjectId, editingQuestionId: state.editingQuestionId }),
}));