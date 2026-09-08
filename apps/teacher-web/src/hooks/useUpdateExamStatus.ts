import { useState } from "react";
import { updateExamStatus } from "../services/examBuilderService";

// manages loading and error state for Save/Publish transitions
export function useUpdateExamStatus() {
  const [error, setError] = useState<string | null>(null);

  // marks the exam as draft but not yet visible to students
  async function saveDraft(examId: string): Promise<boolean> {
    setError(null);
    try {
      await updateExamStatus(examId, "draft");
      return true;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not save exam. Try again.",
        );
      return false;
    }
  }

  // marks the exam as saved but not yet visible to students
  async function saveExam(examId: string): Promise<boolean> {
    setError(null);
    try {
      await updateExamStatus(examId, "saved");
      return true;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not save exam. Try again.",
        );
      return false;
    }
  }

  async function saveExamEdit(examId: string): Promise<boolean> {
    setError(null);
    try {
      await updateExamStatus(examId, "active");
      return true;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not save exam. Try again.",
        );
      return false;
    }
  }

  return { saveDraft, saveExam, saveExamEdit, error };
}
