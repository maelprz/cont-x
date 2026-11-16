import { useEffect, useState } from "react";
import { getExamsByTeacherId } from "../services/examService";
import type { ExamCard } from "../screens/examLibrary/examLibraryScreen.types";
import { useAuthStore } from "../store/useAuthStore";
import { useExamBuilderStore } from "../store/useExamBuilderStore";

export function useExamLibrary() {
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const teacherId = useAuthStore((state) => state.user?.id);
  const isSavingExam = useExamBuilderStore((state) => state.backgroundSave?.status === "saving");

  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;

    async function loadExams(id: string) {
      try {
        const result = await getExamsByTeacherId(id);
        if (isActive) {
          setExams(result);
          setError(null);
        }
      } catch {
        if (isActive) setError("Could not fetch exams. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadExams(teacherId);

    return () => {
      isActive = false; // prevents stale updates if teacher changes or unmounts
    };
  }, [teacherId, isSavingExam, refresh]);

  // re-runs the fetch, used after publish/end/delete to refresh the list
  const refetch = () => setRefresh((value) => value + 1);

  return { exams, isLoading, error, refetch };
}
