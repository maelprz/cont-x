import { useEffect, useState } from "react";
import { getExamResults } from "../services/examResultService";
import type { ExamResultsData } from "../services/examResultService";

export function useExamResults(examId: string | null) {
  const [data, setData] = useState<ExamResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return; // nothing to fetch without an exam selected

    let isActive = true; // prevents stale updates if examId changes mid-fetch

    async function load(id: string) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getExamResults(id);
        if (isActive) setData(result);
      } catch (err) {
        if (isActive) setError("Could not load exam results. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load(examId);

    return () => {
      isActive = false;
    };
  }, [examId]);

  return { data, isLoading, error };
}
