import { useEffect, useState } from "react"; // state and the fetch effect
import { getSessionReview } from "../services/examService"; // the RPC call
import type { SessionReview } from "../services/examService"; // the loaded shape

// Loads the answer review, but only when the teacher allows it.
export function useSessionReview(
  sessionId: string | null | undefined, // which attempt to review
  enabled: boolean, // false until we know review is permitted
) {
  const [review, setReview] = useState<SessionReview | null>(null); // the loaded review
  const [isLoading, setIsLoading] = useState(false); // true while fetching
  const [error, setError] = useState<string | null>(null); // message to show on failure

  useEffect(() => {
    if (!sessionId || !enabled) return; // nothing to fetch, so don't call the server

    let isMounted = true; // ignores a late answer after unmount or id change

    async function load() {
      setIsLoading(true); // show the loading state
      setError(null); // clear an old error
      try {
        const result = await getSessionReview(sessionId!); // the guarded RPC
        if (isMounted) setReview(result); // store it
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load your answers.",
          ); // readable fallback
        }
      } finally {
        if (isMounted) setIsLoading(false); // done either way
      }
    }

    load(); // start the fetch

    return () => {
      isMounted = false; // cleanup for the guard above
    };
  }, [sessionId, enabled]); // re-run if the session or permission changes

  return { review, isLoading, error }; // the screen reads these back
}
