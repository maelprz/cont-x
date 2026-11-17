import { useState } from "react"; // tracks loading and error state across renders
import {
  submitExamSession,
  type SubmitExamSessionResult,
  type SubmittedAnswer,
} from "../services/examService"; // the actual Supabase call
import { useExamSessionStore } from '../stores/useExamSessionStore';

// One answer to submit, matches the shape the service function expects.

// Holds the state and logic for submitting and grading an exam session.
// Component stays dumb — it just calls submitSession and reads the state back.
export function useSubmitExamSession() {
  const [isSubmitting, setIsSubmitting] = useState(false); // true while grading is in flight
  const [error, setError] = useState<string | null>(null); // holds a message to show the student
  const [submissionLocked, setSubmissionLocked] = useState(() => Boolean(useExamSessionStore.getState().offlineExam?.gradingState?.submission));

  // Runs the real grading call and returns the result, or null if it failed.
  async function submitSession(
    sessionId: string, // which session to grade and close
    status: "submitted" | "timed_out", // how this submission happened
    answers: SubmittedAnswer[], // every collected answer, answered or not
  ): Promise<SubmitExamSessionResult | null> {
    setIsSubmitting(true); // show a loading state while grading runs
    setError(null); // clear any previous error before trying again
    let locallyGraded = submissionLocked;

    try {
      const result = await submitExamSession(sessionId, status, answers, () => { locallyGraded = true; setSubmissionLocked(true); });
      return result; // caller decides what happens next
    } catch (error) {
      setError(locallyGraded ? "Your locally graded submission is saved. Reconnect and retry sync."
        : error instanceof Error ? error.message : "Local grading could not finish. Your answers are still here; retry.");
      return null;
    } finally {
      setIsSubmitting(false); // loading is done either way
    }
  }

  return { submitSession, isSubmitting, error, submissionLocked, clearError: () => setError(null) };
}
