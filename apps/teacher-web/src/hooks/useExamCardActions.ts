import { useState } from "react";
import { publishExam, endExam, deleteExam, SESSION_CODE_REQUIRED_MESSAGE } from "../services/examService";

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
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  // publish needs a third outcome — "needs a code" isn't a real error, it's a prompt.
  // Kept separate from runAction so the caller can react to it synchronously via the return value.
  async function handlePublish(
    examId: string,
    verificationCode?: string,
  ): Promise<"success" | "needsCode" | "error"> {
    setIsProcessing(true);
    setError(null);
    try {
      await publishExam(examId, verificationCode);
      return "success";
    } catch (err) {
      if (err instanceof Error && err.message === SESSION_CODE_REQUIRED_MESSAGE) {
        return "needsCode"; // not shown as an error banner — the UI opens a prompt instead
      }
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      return "error";
    } finally {
      setIsProcessing(false);
    }
  }

  const handleEnd = (examId: string) => runAction(() => endExam(examId));
  const handleDelete = (examId: string) => runAction(() => deleteExam(examId));

  return { handlePublish, handleEnd, handleDelete, isProcessing, error };
}