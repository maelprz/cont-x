import { useState, useEffect } from "react";
import {
  fetchExamHistory,
  type ExamHistoryEntry,
} from "../services/examHistoryService";

interface UseExamHistoryReturn {
  examHistory: ExamHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

// DIP boundary — dashboardScreen calls this hook, never examHistoryService directly.
// If the data source changes, only this hook and the service change.
export function useExamHistory(): UseExamHistoryReturn {
  const [examHistory, setExamHistory] = useState<ExamHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExamHistory() {
      try {
        const data = await fetchExamHistory();
        setExamHistory(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load exam history.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadExamHistory();
  }, []); // runs once on mount — dashboard only needs this on first load

  return { examHistory, isLoading, error };
}
