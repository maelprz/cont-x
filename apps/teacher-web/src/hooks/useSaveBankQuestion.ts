import { useState } from "react";
import { saveBankQuestion } from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";
import type { BuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

// Saves one bank question, reusing the same editor panels as Exam Builder.
export function useSaveBankQuestion() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveQuestion(question: BuilderQuestion): Promise<boolean> {
    if (!teacherId) {
      setError("Not authenticated.");
      return false;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveBankQuestion(teacherId, question);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this question.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { saveQuestion, isSaving, error };
}