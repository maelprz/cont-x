import { create } from "zustand";

interface ExamLibraryState {
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
}

export const useExamLibraryStore = create<ExamLibraryState>((set) => ({
  selectedSubjectId: null,
  setSelectedSubjectId: (id: string | null) => set({ selectedSubjectId: id }),
}));