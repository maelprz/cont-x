import { useEffect, useState } from "react";
import { getExamById } from "../services/examBuilderService";
import type { ExamBuilderData } from "../services/examBuilderService";
import { useExamBuilderStore } from "../store/useExamBuilderStore";

export function useExamBuilder() {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    examId: string;
    request: number;
    data: ExamBuilderData | null;
    error: string | null;
  } | null>(null);

  const currentExamId = useExamBuilderStore((state) => state.currentExamId);

  useEffect(() => {
    if (!currentExamId) return;

    let isActive = true;

    async function loadExam(examId: string) {
      try {
        const data = await getExamById(examId);
        if (isActive) setResult({ examId, request, data, error: null });
      } catch (err) {
        console.error("Could not load exam", err); // the full error, for the browser console
        // the database's own message (Supabase errors are plain objects, not Error instances)
        const detail =
          err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
        if (isActive) setResult({ examId, request, data: null,
          error: detail ? `Could not load exam. Try again. (${detail})` : "Could not load exam. Try again." });
      }
    }

    loadExam(currentExamId);

    return () => {
      isActive = false; // prevents stale updates if id changes or unmounts
    };
  }, [currentExamId, request]);

  const currentResult = result?.examId === currentExamId && result.request === request ? result : null;
  return {
    examData: currentResult?.data ?? null,
    isLoading: Boolean(currentExamId) && !currentResult,
    error: currentResult?.error ?? null,
    retry: () => setRequest((value) => value + 1),
  };
}
