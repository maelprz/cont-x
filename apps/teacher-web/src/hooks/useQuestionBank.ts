import { useState, useEffect, useCallback, useRef } from "react";
import {
  getQuestionBank,
  type BankQuestionSummary,
} from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";

// only show questions that are visible to the teacher
export function useQuestionBank(subjectId: string | null, includeShared = false) {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [result, setResult] = useState<{ key: string; questions: BankQuestionSummary[]; error: string | null } | null>(null);
  const request = useRef(0);
  const key = teacherId && subjectId ? JSON.stringify([teacherId, subjectId, includeShared]) : null;

  const load = useCallback(() => {
    if (!key || !teacherId || !subjectId) return Promise.resolve();
    const id = ++request.current;
    return getQuestionBank(teacherId, subjectId, includeShared)
      .then((questions) => {
        if (id === request.current) setResult({ key, questions, error: null });
      })
      .catch((err: unknown) => {
        if (id === request.current) setResult({ key, questions: [], error: err instanceof Error ? err.message : "Could not load the question bank." });
      });
  }, [key, teacherId, subjectId, includeShared]);

  const refetch = useCallback(() => {
    setResult(null);
    return load();
  }, [load]);

  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);

  const current = result?.key === key ? result : null;
  return { questions: current?.questions ?? [], isLoading: key !== null && current === null, error: current?.error ?? null, refetch };
}
