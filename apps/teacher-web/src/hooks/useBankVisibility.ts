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
  const [settings, setSettings] = useState<BankVisibilitySettings>({ mainLevel: null, subjectLevels: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) return;
    let isActive = true;
    getBankVisibilitySettings(teacherId)
      .then((result) => {
        if (isActive) setSettings(result);
      })
      .catch(() => {
        if (isActive) setError("Could not load sharing settings.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
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
        setSettings((prev) => ({ ...prev, subjectLevels: { ...prev.subjectLevels, [subjectId]: level } }));
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
        setSettings((prev) => ({ ...prev, mainLevel: level }));
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

  return { settings, isLoading, isSaving, error, updateSubjectLevel, updateMainLevel };
}