import { useState, useEffect, useCallback } from "react";
import {
  getQuestionBank,
  type BankQuestionSummary,
} from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";

// only show questions that are visible to the teacher
export function useQuestionBank(subjectId: string | null, includeShared = false) {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [questions, setQuestions] = useState<BankQuestionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!teacherId || !subjectId) {
      setQuestions([]);
      setIsLoading(false);
      return; // not logged in yet, or no subject chosen — nothing to fetch
    }

    setIsLoading(true);
    setError(null);
    try {
      const questionRows = await getQuestionBank(teacherId, subjectId, includeShared);
      setQuestions(questionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the question bank.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, subjectId, includeShared]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { questions, isLoading, error, refetch };
}
