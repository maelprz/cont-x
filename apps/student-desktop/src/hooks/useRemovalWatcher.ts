import { useEffect } from "react";
import { checkIfRemoved } from "../services/removalService";

const HEARTBEAT_MS = 60000; // check about once a minute
const JITTER_MS = 10000; // add up to 10 seconds so students don't all hit the database together

export function useRemovalWatcher(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return; // no active session, nothing to watch

    let stopped = false; // flips to true when the screen closes
    let timerId: ReturnType<typeof setTimeout> | undefined; // handle so we can cancel the pending check

    const scheduleNext = () => {
      const delay = HEARTBEAT_MS + Math.floor(Math.random() * JITTER_MS); // 60-70 seconds
      timerId = setTimeout(async () => {
        const removed = await checkIfRemoved(sessionId); // false on "still running" and on errors
        if (!stopped && !removed) scheduleNext(); // keep watching until removed or the screen closes
      }, delay);
    };

    scheduleNext(); // start the first wait

    return () => {
      stopped = true; // stop rescheduling after cleanup
      if (timerId) clearTimeout(timerId); // cancel any check still waiting
    };
  }, [sessionId]);
}
