import { useState, useEffect } from "react";
import {
  fetchAllExamHistory,
  type ExamHistoryEntry,
} from "../services/examHistoryService";

interface UseAllExamHistoryReturn {
  examHistory: ExamHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

// DIP boundary — archiveScreen calls this hook, never the service directly.
export function useAllExamHistory(): UseAllExamHistoryReturn {
  const [examHistory, setExamHistory] = useState<ExamHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAllExamHistory() {
      try {
        const data = await fetchAllExamHistory();
        setExamHistory(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load exam history.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAllExamHistory();
  }, []); // runs once on mount

  return { examHistory, isLoading, error };
}
