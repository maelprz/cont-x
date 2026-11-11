import { useEffect, useState } from "react";
import { getSessionRules, type SessionRules } from "../services/examService";

// The rules used until the real ones arrive. Sequential starts ON, so a student can never skip
// ahead during the moment before the rules load; a failed load falls back to "no rules".
const STRICT_WHILE_LOADING: SessionRules = {
  sequential: true,
  allowReview: false,
  allowOvertime: false,
  overtimePolicy: "accept",
  answerChangeDeduction: 0,
};
const NO_RULES: SessionRules = { ...STRICT_WHILE_LOADING, sequential: false };

// Loads the teacher's rules for this attempt (sequential order, etc.) once.
export function useSessionRules(sessionId: string | null) {
  const [rules, setRules] = useState<SessionRules>(STRICT_WHILE_LOADING);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let isActive = true; // ignore a late answer if the screen has gone

    getSessionRules(sessionId)
      .then((loaded) => {
        if (isActive) setRules(loaded);
      })
      .catch((err) => {
        console.error("Could not load the exam rules", err);
        if (isActive) setRules(NO_RULES); // better to let the exam run than to block it on a failed request
      })
      .finally(() => {
        if (isActive) setIsLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, [sessionId]);

  return { rules, isLoaded };
}