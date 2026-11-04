import { useEffect, useRef } from "react";
import { logViolation, type RawViolation } from "../services/violationService";
import type { MutableRefObject } from "react";

const DEBOUNCE_MS = 2000; // minimum time between logs of the same violation

export function useViolationLogger(
  sessionId: string | null,
  questionIdRef: MutableRefObject<string | null>,
) {
  const lastLoggedAt = useRef<Record<string, number>>({}); // tracks last log time for each violation type

  useEffect(() => {
    if (!sessionId) return;

    const handleViolation = (payload: {
      violationType: string;
      occurredAt: string;
    }) => {
      console.log("Hook received violation");
      console.log("Current sessionId:", sessionId);
      console.log(payload);
      const now = Date.now();
      const lastTime = lastLoggedAt.current[payload.violationType] ?? 0;

      // too soon since the last log of this same type — skip it
      if (now - lastTime < DEBOUNCE_MS) return;

      lastLoggedAt.current[payload.violationType] = now;
      logViolation(
        sessionId,
        payload.violationType as RawViolation,
        questionIdRef.current,
      );
    };

    const unsubscribe = (window as any).ipcRenderer.onViolation(
      handleViolation,
    );

    return () => {
      unsubscribe();
      lastLoggedAt.current = {}; // reset on unmount to avoid stale state
    };
  }, [sessionId]);
}
