import { useEffect, useState } from "react";
import { getSessionReview, type SessionReview } from "../services/examService";

export function useSessionReview(sessionId: string | null | undefined, enabled: boolean) {
  const [review, setReview] = useState<SessionReview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true, fetching = false;
    setReview(null); setError(null); setIsLoading(false);
    if (!sessionId || !enabled) return;
    async function load() {
      if (fetching) return;
      fetching = true; setIsLoading(true);
      try {
        const result = await getSessionReview(sessionId!);
        if (active) { setReview(result); setError(null); }
      } catch (err) {
        if (active) { setReview(null); setError(err instanceof Error ? err.message : "Could not load your answers."); }
      } finally { fetching = false; if (active) setIsLoading(false); }
    }
    void load();
    const interval = setInterval(load, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [sessionId, enabled, reload]);
  return { review, isLoading, error, retry: () => setReload(value => value + 1) };
}
