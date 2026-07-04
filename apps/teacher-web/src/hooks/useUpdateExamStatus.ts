import { useState } from "react";
import { updateExamStatus } from "../services/examBuilderService";

// manages loading and error state while changing an exam's status
export function useUpdateExamStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // writes the new status, returns true only if it succeeded
  async function changeStatus(
    examId: string,
    status: "saved" | "active",
  ): Promise<boolean> {
    setIsUpdating(true);
    setError(null);
    try {
      await updateExamStatus(examId, status);
      return true;
    } catch (err) {
      setError("Could not update exam status. Try again.");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  return { changeStatus, isUpdating, error };
}
