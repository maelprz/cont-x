import { useState, useEffect, useCallback, useRef } from "react";
import { getStudentAttempts, type StudentAttempt } from "../services/studentAttemptsService"; 

// loads the list of attempts for ONE student in ONE class exam, only while a student is selected
export function useStudentAttempts(classExamId: string | null, studentId: string | null) {
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]); // oldest first, so the last one is the latest attempt
  const [isLoading, setIsLoading] = useState(false); // true while a load is running
  const [error, setError] = useState<string | null>(null); // message shown in the modal
  const requestCounterRef = useRef(0); // numbers each load so an older one cannot overwrite a newer one

  const refetch = useCallback(async () => {
    if (classExamId === null || studentId === null) {
      setAttempts([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestCounterRef.current; // this load's number
    setIsLoading(true);
    setError(null);
    try {
      const result = await getStudentAttempts(classExamId, studentId);
      if (requestId !== requestCounterRef.current) return; // a newer load started, drop this result
      setAttempts(result);
    } catch (err) {
      if (requestId !== requestCounterRef.current) return; // ignore errors from an outdated load
      setError(err instanceof Error ? err.message : "Failed to load attempts.");
    } finally {
      if (requestId === requestCounterRef.current) setIsLoading(false); // only the newest load turns the spinner off
    }
  }, [classExamId, studentId]);

  useEffect(() => {
    void refetch(); // load when a student is opened, clear when the modal closes
  }, [refetch]);

  return { attempts, isLoading, error, refetch };
}