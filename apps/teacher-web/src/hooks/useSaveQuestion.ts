import { useState } from "react";
import { saveQuestion as saveQuestionToDb } from "../services/examBuilderService";
import { useExamBuilderStore } from "../store/useExamBuilderStore";
import type { BuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

export function useSaveQuestion() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentExamId = useExamBuilderStore((state) => state.currentExamId);

  // saves the given question against the exam currently open in the builder
  async function saveQuestion(question: BuilderQuestion): Promise<boolean> {
    if (!currentExamId) return false; // no exam open, nothing to save against

    setIsSaving(true);
    setError(null);
    try {
      await saveQuestionToDb(currentExamId, question);
      return true;
    } catch (err) {
      setError("Could not save question. Try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { saveQuestion, isSaving, error };
}