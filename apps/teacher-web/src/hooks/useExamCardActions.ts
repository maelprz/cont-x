import { useState } from "react";
import { publishExam, endExam, deleteExam } from "../services/examService";

// manages loading and error state for the three-dot menu actions
export function useExamCardActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // runs one action, returns true only if it succeeded
  async function runAction(action: () => Promise<void>): Promise<boolean> {
    setIsProcessing(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      // shows the real message for known errors, a generic one otherwise
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePublish = (examId: string) =>
    runAction(() => publishExam(examId));
  const handleEnd = (examId: string) => runAction(() => endExam(examId));
  const handleDelete = (examId: string) => runAction(() => deleteExam(examId));

  return { handlePublish, handleEnd, handleDelete, isProcessing, error };
}
