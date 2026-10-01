import { useState, useEffect } from "react";
import { getClassExamSettings } from "../services/classExamService";
import type { ClassExamSettingsData } from "../services/classExamService";

// Fetches and manages the settings for a specific class_exam
export function useExamSettings(classExamId: string | null) {
  const [settings, setSettings] = useState<ClassExamSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classExamId) {
      setSettings(null); // nothing to load, clear any stale data
      return;
    }

    let isMounted = true; // guards against setting state after unmount

    async function fetchSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getClassExamSettings(classExamId!);
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
  }, [classExamId]);

  return { settings, isLoading, error };
}