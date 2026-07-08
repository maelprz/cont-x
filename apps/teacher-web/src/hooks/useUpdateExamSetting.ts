import { useState } from "react"; // tracks saving/error state across renders
import { updateExamSettings } from "../services/examBuilderService"; // the actual Supabase call

// Holds the state and logic for saving an exam's description and max attempts.
export function useUpdateExamSettings() {
  const [isSaving, setIsSaving] = useState(false); // true while the update is in flight
  const [error, setError] = useState<string | null>(null); // holds a message to show the teacher

  // Saves description + max attempts together, returns true on success.
  async function saveSettings(
    examId: string, // which exam to update
    description: string, // optional, empty string is valid
    maxAttempts: number, // must be at least 1
    durationMinutes: number, // total minutes, already converted from hours+minutes by the caller
  ): Promise<boolean> {
    setIsSaving(true); // show a saving state
    setError(null); // clear any previous error

    try {
      await updateExamSettings(examId, {
        description,
        maxAttempts,
        durationMinutes,
      }); // ask the service to save it
      return true;
    } catch (err) {
      setError("Could not save exam settings. Try again."); // network/DB failure
      return false;
    } finally {
      setIsSaving(false); // saving is done either way
    }
  }

  return { saveSettings, isSaving, error }; // expose state + the action to the component
}
