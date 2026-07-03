import { useState } from "react";
import { createDraftExam } from "../services/examBuilderService";
import { useAuthStore } from "../store/useAuthStore";

export function useCreateExam() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teacherId = useAuthStore((state) => state.user?.id);

  // creates a new draft exam and gives back its id, or null on failure
  async function createExam(): Promise<string | null> {
    if (!teacherId) return null; // no logged-in teacher, nothing to do

    setIsCreating(true);
    setError(null);
    try {
      const newExamId = await createDraftExam(teacherId);
      return newExamId;
    } catch (err) {
      setError("Could not create exam. Try again.");
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  return { createExam, isCreating, error };
}