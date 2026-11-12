import { useEffect, useState } from "react";
import { getSessionRules, type SessionRules } from "../services/examService";

// The rules used until the real ones arrive. Sequential starts ON, so a student can never skip
// ahead before the rules load. A failed request keeps the exam blocked for retry.
const STRICT_WHILE_LOADING: SessionRules = {
  sequential: true,
  allowReview: false,
  allowOvertime: false,
  overtimePolicy: "accept",
  answerChangeDeduction: 0,
};

// Loads the teacher's rules for this attempt (sequential order, etc.) once.
export function useSessionRules(sessionId: string | null) {
  const [rules, setRules] = useState<SessionRules>(STRICT_WHILE_LOADING);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
    setRules(STRICT_WHILE_LOADING);
    if (!sessionId) return;
    let isActive = true; // ignore a late answer if the screen has gone

    getSessionRules(sessionId)
      .then((loaded) => {
        if (isActive) {
          setRules(loaded);
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.error("Could not load the exam rules", err);
        if (isActive) setError("Exam settings could not be loaded. Please retry to continue.");
      });

    return () => {
      isActive = false;
    };
  }, [sessionId, loadAttempt]);

  return { rules, isLoaded, error, retry: () => setLoadAttempt((attempt) => attempt + 1) };
}
