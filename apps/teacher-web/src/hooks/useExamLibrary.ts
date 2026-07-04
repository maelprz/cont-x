import { useEffect, useState } from "react";
import { getExamsByTeacherId } from "../services/examService";
import type { ExamCard } from "../screens/examLibrary/examLibraryScreen.types";
import { useAuthStore } from "../store/useAuthStore";

export function useExamLibrary() {
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teacherId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;

    async function loadExams(id: string) {
      setIsLoading(true);
      try {
        const result = await getExamsByTeacherId(id);
        if (isActive) setExams(result);
      } catch (err) {
        if (isActive) setError("Could not fetch exams. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadExams(teacherId);

    return () => {
      isActive = false; // prevents stale updates if teacher changes or unmounts
    };
  }, [teacherId]);

  // re-runs the fetch, used after publish/end/delete to refresh the list
  const refetch = () => {
    if (!teacherId) return;
    getExamsByTeacherId(teacherId)
      .then(setExams)
      .catch(() => setError("Could not refresh exams."));
  };

  return { exams, isLoading, error, refetch };
}
