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

    async function loadExams(teacherId: string) {
      setIsLoading(true);
      try {
        const result = await getExamsByTeacherId(teacherId);
        if (isActive) setExams(result);
      } catch (err) {
        if (isActive) setError("Could not fetch exams. Try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadExams(teacherId);
  }, [teacherId]);

  return { exams, isLoading, error };
}
