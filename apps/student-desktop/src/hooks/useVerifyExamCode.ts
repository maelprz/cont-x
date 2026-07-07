import { useState } from "react"; // tracks loading and error state across renders
import { lookupExamByCode } from "../services/examService"; // the actual Supabase call
import type { ExamLookupResult } from "../services/examService"; // shape of a found exam

// Holds the state and logic for verifying a student-entered exam code.
// Component stays dumb — it just calls verifyExamCode and reads the state back.
export function useVerifyExamCode() {
  const [isVerifying, setIsVerifying] = useState(false); // true while the lookup is in flight
  const [error, setError] = useState<string | null>(null); // holds a message to show the student

  // Runs the lookup and returns the exam if found, or null if not found/invalid input.
  async function verifyExamCode(
    examCode: string, // raw value from the Dashboard input
  ): Promise<ExamLookupResult | null> {
    const trimmedCode = examCode.trim(); // remove accidental leading/trailing spaces

    if (trimmedCode.length === 0) {
      setError("Please enter an exam code."); // block empty submissions
      return null;
    }

    setIsVerifying(true); // show a loading state while we check
    setError(null); // clear any previous error before trying again

    try {
      const exam = await lookupExamByCode(trimmedCode); // ask the service to look it up

      if (!exam) {
        setError("No exam found with that code."); // code didn't match any row
        return null;
      }

      // early, friendly warning — the server still enforces this for real on Confirmation
      if (exam.attemptsRemaining <= 0) {
        setError("You have no attempts remaining for this exam.");
        return null;
      }

      return exam; // found it — caller decides what happens next
    } catch (err) {
      setError("Something went wrong. Please try again."); // network/DB failure
      return null;
    } finally {
      setIsVerifying(false); // loading is done either way
    }
  }

  return { verifyExamCode, isVerifying, error }; // expose state + the action to the component
}
