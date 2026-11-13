import { useCallback, useEffect, useState } from "react";
import {
  getBankVisibilitySettings,
  setMainVisibility,
  setSubjectVisibility,
} from "../services/bankVisibilityService";
import type { BankVisibilityLevel, BankVisibilitySettings } from "../services/bankVisibilityService";
import { useAuthStore } from "../store/useAuthStore";

// Loads the teacher's bank sharing settings and saves changes to them.
export function useBankVisibility() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [loaded, setLoaded] = useState<{ teacherId: string; settings: BankVisibilitySettings | null } | null>(null);
  const current = loaded?.teacherId === teacherId ? loaded : null;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) return;
    let isActive = true;
    getBankVisibilitySettings(teacherId)
      .then((result) => {
        if (isActive) {
          setLoaded({ teacherId, settings: result });
          setError(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setLoaded({ teacherId, settings: null });
          setError("Could not load sharing settings.");
        }
      });
    return () => {
      isActive = false;
    };
  }, [teacherId]);

  const updateSubjectLevel = useCallback(
    async (subjectId: string, level: BankVisibilityLevel): Promise<boolean> => {
      if (!teacherId) return false;
      setIsSaving(true);
      setError(null);
      try {
        await setSubjectVisibility(teacherId, subjectId, level);
        setLoaded((prev) => prev?.teacherId === teacherId && prev.settings
          ? { teacherId, settings: { ...prev.settings, subjectLevels: { ...prev.settings.subjectLevels, [subjectId]: level } } }
          : prev);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save this setting.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [teacherId],
  );

  const updateMainLevel = useCallback(
    async (level: BankVisibilityLevel | null): Promise<boolean> => {
      if (!teacherId) return false;
      setIsSaving(true);
      setError(null);
      try {
        await setMainVisibility(teacherId, level);
        setLoaded((prev) => prev?.teacherId === teacherId && prev.settings
          ? { teacherId, settings: { ...prev.settings, mainLevel: level } }
          : prev);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save this setting.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [teacherId],
  );

  return { settings: current?.settings ?? null, isLoading: !current, isSaving, error: current ? error : null, updateSubjectLevel, updateMainLevel };
}
