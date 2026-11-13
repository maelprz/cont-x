import { create } from "zustand"; // store library
import { persist, createJSONStorage } from "zustand/middleware"; // browser storage helpers

interface ExamLibraryState {
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
}

export const useExamLibraryStore = create<ExamLibraryState>()(
  persist(
    (set) => ({
      selectedSubjectId: null, // null means the subject list is showing
      setSelectedSubjectId: (id: string | null) => set({ selectedSubjectId: id }), // open or close a subject
    }),
    {
      name: "contx-exam-library", // sessionStorage key
      storage: createJSONStorage(() => sessionStorage), // survives refresh, not a closed tab
      partialize: (state) => ({ selectedSubjectId: state.selectedSubjectId }), // only the subject id is saved
    },
  ),
);