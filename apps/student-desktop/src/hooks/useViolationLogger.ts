import { useEffect, useRef } from "react";
import { logViolation } from "../services/violationService";
import type { MutableRefObject } from "react";
import type { ViolationEvent } from "../types/violationEvent";

const DEBOUNCE_MS = 2000; // minimum time between logs of the same violation

export function useViolationLogger(
  sessionId: string | null,
  questionIdRef: MutableRefObject<string | null>,
) {
  const lastLoggedAt = useRef<Record<string, number>>({}); // tracks last log time for each violation type

  useEffect(() => {
    if (!sessionId) return;

    const handleViolation = (payload: ViolationEvent) => {
      // The process monitor already suppresses repeats per app.
      if (payload.violationType === "disallowed_process") {
        void logViolation(sessionId, payload, questionIdRef.current);
        return;
      }
      const now = Date.now();
      const lastTime = lastLoggedAt.current[payload.violationType] ?? 0;

      // too soon since the last log of this same type — skip it
      if (now - lastTime < DEBOUNCE_MS) return;

      lastLoggedAt.current[payload.violationType] = now;
      void logViolation(sessionId, payload, questionIdRef.current);
    };

    const unsubscribe = window.ipcRenderer?.onViolation(handleViolation);

    return () => {
      unsubscribe?.();
      lastLoggedAt.current = {}; // reset on unmount to avoid stale state
    };
  }, [sessionId]);
}
