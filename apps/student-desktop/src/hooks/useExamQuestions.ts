import { useEffect, useState } from "react"; // tracks fetch state across renders
import {
  getExamQuestions,
  type FetchedQuestion,
} from "../services/examService"; // the real Supabase call

// Fetches every question for one exam, once, when examId is available.
export function useExamQuestions(examId: string | null) {
  const [questions, setQuestions] = useState<FetchedQuestion[]>([]); // holds the fetched question list
  const [isLoading, setIsLoading] = useState(true); // true while the fetch is in flight
  const [error, setError] = useState<string | null>(null); // holds a message to show, if any

  useEffect(() => {
    if (!examId) {
      setIsLoading(false); // nothing to fetch yet, don't spin forever
      return;
    }

    let isMounted = true; // guards against setting state after unmount

    async function fetchQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getExamQuestions(examId!); // real fetch + reshape
        if (isMounted) setQuestions(result);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load questions.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      isMounted = false; // cleanup if the screen unmounts mid-fetch
    };
  }, [examId]);

  return { questions, isLoading, error };
}