import { useCallback, useEffect, useMemo, useState } from "react";
import { getAssignedSubjects } from "../services/subjectService";
import type { AssignedSubject } from "../services/subjectService";
import { getBankCountsBySubject } from "../services/questionBankService";
import { useAuthStore } from "../store/useAuthStore";

export interface BankSubjectCard {
  id: string;
  name: string;
  totalCount: number; // questions the teacher can see in this sub-bank (own + shared)
  ownCount: number;
}

// The sub-question banks: one per subject the teacher is assigned to.
export function useBankSubjects() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [assigned, setAssigned] = useState<AssignedSubject[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; own: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!teacherId) return Promise.resolve();
    return Promise.all([getAssignedSubjects(teacherId), getBankCountsBySubject(teacherId)])
      .then(([subjects, bankCounts]) => {
        setAssigned(subjects);
        setCounts(bankCounts);
        setError(null);
      })
      .catch(() => setError("Could not load your subjects. Try again."))
      .finally(() => setIsLoading(false));
  }, [teacherId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const subjects = useMemo<BankSubjectCard[]>(
    () =>
      assigned
        .map((s) => ({
          id: s.id,
          name: s.name,
          totalCount: counts[s.id]?.total ?? 0,
          ownCount: counts[s.id]?.own ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assigned, counts],
  );

  return { subjects, isLoading, error, refetch };
}