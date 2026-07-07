import { useEffect, useState } from "react"; // tracks fetch state across renders
import {
  getExamConfirmationDetails,
  type ExamConfirmationDetails,
} from "../services/examService"; // the real Supabase call

// Fetches real detail-card numbers for one exam, once, when examId is available.
export function useExamConfirmationDetails(examId: string | null) {
  const [details, setDetails] = useState<ExamConfirmationDetails | null>(null); // holds the fetched numbers
  const [isLoading, setIsLoading] = useState(true); // true while the fetch is in flight
  const [error, setError] = useState<string | null>(null); // holds a message to show, if any

  useEffect(() => {
    if (!examId) {
      setIsLoading(false); // nothing to fetch yet, don't spin forever
      return;
    }

    let isMounted = true; // guards against setting state after unmount

    async function fetchDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getExamConfirmationDetails(examId!); // real fetch + math
        if (isMounted) setDetails(result);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load exam details.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchDetails();

    return () => {
      isMounted = false; // cleanup if the screen unmounts mid-fetch
    };
  }, [examId]);

  return { details, isLoading, error };
}