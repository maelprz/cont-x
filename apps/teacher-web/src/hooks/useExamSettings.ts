import { useState, useEffect } from "react";
import { getExamSettings } from "../services/examBuilderService";
import type { ExamSettingsData } from "../services/examBuilderService";

// Loads one exam's current settings, whenever examId changes.
export function useExamSettings(examId: string | null) {
  const [settings, setSettings] = useState<ExamSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) {
      setSettings(null); // nothing to load, clear any stale data
      return;
    }

    let isMounted = true; // guards against setting state after unmount

    async function fetchSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getExamSettings(examId!);
        if (isMounted) setSettings(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Could not load exam settings.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchSettings();

    return () => {
      isMounted = false; // cleanup if the modal closes mid-fetch
    };
  }, [examId]);

  return { settings, isLoading, error };
}