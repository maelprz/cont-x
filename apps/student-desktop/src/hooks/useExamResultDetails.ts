// new file: apps/student-desktop/src/hooks/useExamResultDetails.ts
import { useEffect, useState } from "react"; // tracks loading/error state and re-fetches when the id changes
import { getExamResultDetails } from "../services/examService"; // the actual Supabase call
import type { ExamResultDetails } from "../services/examService"; // shape of a loaded result

// Holds the state and logic for loading one session's full result.
// Component stays dumb — it just reads details/isLoading/error back.
export function useExamResultDetails(sessionId: string | undefined | null) {
  const [details, setDetails] = useState<ExamResultDetails | null>(null); // holds everything fetched for this session
  const [isLoading, setIsLoading] = useState(true); // starts true, since a fetch begins immediately
  const [error, setError] = useState<string | null>(null); // holds a message to show the student

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false); // nothing to fetch, so stop showing a loading state
      return;
    }

    let isMounted = true; // guards against setting state after this effect is cleaned up

    async function loadDetails() {
      setIsLoading(true); // show a loading state while we fetch
      setError(null); // clear any previous error before trying again

      try {
        const result = await getExamResultDetails(sessionId!); // real fetch for this session
        if (isMounted) setDetails(result);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load exam result.",
          ); // readable fallback message
        }
      } finally {
        if (isMounted) setIsLoading(false); // loading is done either way
      }
    }

    loadDetails();

    return () => {
      isMounted = false; // this session id changed or the screen unmounted
    };
  }, [sessionId]);

  return { details, isLoading, error }; // expose the fetched data + its state to the component
}
