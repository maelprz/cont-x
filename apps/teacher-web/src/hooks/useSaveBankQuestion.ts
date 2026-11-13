import { useState } from "react";
import { saveBankQuestion } from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";
import type { BuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

// Saves one bank question under a subject
export function useSaveBankQuestion() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveQuestion(question: BuilderQuestion, subjectId: string): Promise<boolean> {
    if (!teacherId) {
      setError("Not authenticated.");
      return false;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveBankQuestion(teacherId, subjectId, question);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this question.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { saveQuestion, isSaving, error, clearError: () => setError(null) };
}
