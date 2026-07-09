import { useState } from "react";
import { createDraftExam } from "../services/examBuilderService";
import type { NewExamSettings } from "../services/examBuilderService";
import { useAuthStore } from "../store/useAuthStore";

export function useCreateExam() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teacherId = useAuthStore((state) => state.user?.id);

  // creates a new draft exam with all its initial settings, gives back its id or null
  async function createExam(settings: NewExamSettings): Promise<string | null> {
    if (!teacherId) return null; // no logged-in teacher, nothing to do

    setIsCreating(true);
    setError(null);
    try {
      const newExamId = await createDraftExam(teacherId, settings);
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