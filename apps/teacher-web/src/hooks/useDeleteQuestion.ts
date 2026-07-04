import { useState } from "react";
import { deleteQuestion as deleteQuestionFromDb } from "../services/examBuilderService";

export function useDeleteQuestion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // deletes the given question, returns whether it succeeded
  async function deleteQuestion(questionId: string): Promise<boolean> {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteQuestionFromDb(questionId);
      return true;
    } catch (err) {
      setError("Could not delete question. Try again.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  }

  return { deleteQuestion, isDeleting, error };
}