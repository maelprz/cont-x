import { useState, useEffect, useCallback } from "react";
import {
  getQuestionBank,
  getBankTags,
  type BankQuestionSummary,
  type BankTag,
} from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";

// only show questions that are visible to the teacher
export function useQuestionBank(subjectId: string | null, includeShared = false) {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [questions, setQuestions] = useState<BankQuestionSummary[]>([]);
  const [tags, setTags] = useState<BankTag[]>([]);
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
      const [questionRows, tagRows] = await Promise.all([
        getQuestionBank(teacherId, subjectId, includeShared),
        getBankTags(teacherId), // tags stay personal to each teacher
      ]);
      setQuestions(questionRows);
      setTags(tagRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the question bank.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, subjectId, includeShared]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { questions, tags, isLoading, error, refetch };
}