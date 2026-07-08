import { useState, useEffect, useCallback } from "react";
import {
  getQuestionBank,
  getBankTags,
  type BankQuestionSummary,
  type BankTag,
} from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";

// Loads every bank question and tag belonging to the logged-in teacher.
export function useQuestionBank() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [questions, setQuestions] = useState<BankQuestionSummary[]>([]);
  const [tags, setTags] = useState<BankTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!teacherId) return; // not logged in yet, nothing to fetch

    setIsLoading(true);
    setError(null);
    try {
      const [questionRows, tagRows] = await Promise.all([
        getQuestionBank(teacherId), // real bank questions
        getBankTags(teacherId), // real tag list for filters
      ]);
      setQuestions(questionRows);
      setTags(tagRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the question bank.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { questions, tags, isLoading, error, refetch };
}