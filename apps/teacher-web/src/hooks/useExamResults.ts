import { useEffect, useState } from "react";
import { getClassExamResults } from "../services/examResultService";
import type { ExamResultsData } from "../services/examResultService";

export function useExamResults(classExamId: string | null) {
  const [data, setData] = useState<ExamResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bumping this re-runs the fetch

  useEffect(() => {
    if (!classExamId) return; // nothing to fetch without a class exam selected

    let isActive = true; // prevents stale updates if classExamId changes mid-fetch

    async function load(id: string) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getClassExamResults(id);
        if (isActive) setData(result);
      } catch {
        if (isActive) setError("Could not load exam results. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load(classExamId);

    return () => {
      isActive = false;
    };
  }, [classExamId, reloadKey]);

  const refetch = () => setReloadKey((key) => key + 1);

  return { data, isLoading, error, refetch };
}