import { useState } from "react";
import { updateExamSettings } from "../services/examBuilderService";

// Saves edited settings from the Edit Settings modal.
export function useUpdateExamSettingsForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(
    examId: string,
    settings: {
      description: string;
      maxAttempts: number;
      durationMinutes: number;
      verificationCode?: string;
    },
  ): Promise<boolean> {
    setIsSaving(true);
    setError(null);
    try {
      await updateExamSettings(examId, settings);
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