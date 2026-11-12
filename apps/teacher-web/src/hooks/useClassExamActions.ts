import { useState } from "react";
import {
  activateClassExam,
  endClassExam,
  removeClassExamAttachment,
  SESSION_CODE_REQUIRED_MESSAGE,
} from "../services/classExamService";

// class_exam level actions for each exam attached to a class
export function useClassExamActions() {
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

  // same "needs a code" vs real-error split the old handlePublish had
  async function handlePublish(
    classExamId: string,
    verificationCode?: string,
  ): Promise<{ status: "success"; sessionCode: string } | { status: "needsCode" | "error" }> {
    setIsProcessing(true);
    setError(null);
    try {
      const sessionCode = await activateClassExam(classExamId, verificationCode);
      return { status: "success", sessionCode };
    } catch (err) {
      if (err instanceof Error && err.message === SESSION_CODE_REQUIRED_MESSAGE) {
        return { status: "needsCode" };
      }
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      return { status: "error" };
    } finally {
      setIsProcessing(false);
    }
  }

  const handleEnd = (classExamId: string) => runAction(() => endClassExam(classExamId));
  const handleRemove = (classExamId: string) => runAction(() => removeClassExamAttachment(classExamId));

  return { handlePublish, handleEnd, handleRemove, isProcessing, error };
}
