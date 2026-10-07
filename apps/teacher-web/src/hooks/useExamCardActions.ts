import { useState } from "react";
import { deleteExam } from "../services/examService";

// manages loading and error state for the three-dot menu's exam-level actions.
export function useExamCardActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>): Promise<boolean> {
    setIsProcessing(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  const handleDelete = (examId: string) => runAction(() => deleteExam(examId));

  return { handleDelete, isProcessing, error };
}