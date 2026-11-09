import { useEffect, useState } from "react";
import { getExamById } from "../services/examBuilderService";
import type { ExamBuilderData } from "../services/examBuilderService";
import { useExamBuilderStore } from "../store/useExamBuilderStore";

export function useExamBuilder() {
  const [examData, setExamData] = useState<ExamBuilderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentExamId = useExamBuilderStore((state) => state.currentExamId);

  useEffect(() => {
    if (!currentExamId) {
      setIsLoading(false); // no exam selected, nothing to fetch
      return;
    }

    let isActive = true;

    async function loadExam(examId: string) {
      setIsLoading(true);
      try {
        const result = await getExamById(examId);
        if (isActive) setExamData(result);
      } catch (err) {
        console.error("Could not load exam", err); // the full error, for the browser console
        // the database's own message (Supabase errors are plain objects, not Error instances)
        const detail =
          err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
        if (isActive) setError(detail ? `Could not load exam. Try again. (${detail})` : "Could not load exam. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadExam(currentExamId);

    return () => {
      isActive = false; // prevents stale updates if id changes or unmounts
    };
  }, [currentExamId]);

  return { examData, isLoading, error };
}