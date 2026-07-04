import { useState } from "react";
import { createDraftExam } from "../services/examBuilderService";
import { useAuthStore } from "../store/useAuthStore";

export function useCreateExam() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teacherId = useAuthStore((state) => state.user?.id);

  // creates a new draft exam with the given title, gives back its id or null
  async function createExam(title: string): Promise<string | null> {
    if (!teacherId) return null; // no logged-in teacher, nothing to do

    setIsCreating(true);
    setError(null);
    try {
      const newExamId = await createDraftExam(teacherId, title);
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