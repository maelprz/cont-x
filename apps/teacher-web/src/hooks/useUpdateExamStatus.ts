import { useState } from "react";
import { updateExamStatus, publishExam } from "../services/examBuilderService";

// manages loading and error state for Save/Publish transitions
export function useUpdateExamStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // marks the exam as saved but not yet visible to students
  async function saveOnly(examId: string): Promise<boolean> {
    setIsUpdating(true);
    setError(null);
    try {
      await updateExamStatus(examId, "saved");
      return true;
    } catch (err) {
      setError("Could not save exam. Try again.");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  // publishes the exam with the teacher's chosen verification code
  async function publish(
    examId: string,
    verificationCode: string,
  ): Promise<boolean> {
    setIsUpdating(true);
    setError(null);
    try {
      await publishExam(examId, verificationCode);
      return true;
    } catch (err) {
      setError("Could not publish exam. Try again.");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  return { saveOnly, publish, isUpdating, error };
}
