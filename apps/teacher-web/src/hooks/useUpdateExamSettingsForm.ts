import { useState } from "react";
import { updateClassExamSettings } from "../services/classExamService";

// saves changes to an existing class_exam's settings
export function useUpdateExamSettingsForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(
    classExamId: string,
    settings: {
      durationMinutes: number;
      maxAttempts: number;
      passMark: number | null;
      randomizeOrder: boolean;
      verificationCode?: string;
      startsAt: string | null;
      endsAt: string | null;
    },
  ): Promise<boolean> {
    setIsSaving(true);
    setError(null);
    try {
      await updateClassExamSettings(classExamId, settings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { saveSettings, isSaving, error };
}