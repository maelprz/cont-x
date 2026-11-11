import { useEffect, useRef, useState } from "react"; // tracks countdown state and the interval handle
import { getSessionTimerInfo } from "../services/examService"; // real duration + start time fetch

// What the clock does at zero. By default it is a hard stop: onExpire runs once and the answers
// are submitted. With overtime allowed the clock keeps running past zero (the number goes negative)
// and onExpire never runs: the student decides when to submit.
export interface ExamTimerOptions {
  allowOvertime: boolean; // the teacher's "allow overtime" setting
  rulesReady: boolean; // false until the rules have been fetched; the clock never expires before then
}

// Runs a real countdown for one exam session. Computes remaining time
// from the actual start timestamp, so refreshing the page doesn't reset it.
export function useExamTimer(
  sessionId: string | null, // which session to time
  onExpire: () => void, // called once, exactly when time hits zero (hard-stop exams only)
  options: ExamTimerOptions = { allowOvertime: false, rulesReady: true },
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null while still loading; negative = overtime
  const hasExpiredRef = useRef(false); // guards against calling onExpire more than once

  // FIX — always holds the *latest* onExpire, so the interval below never
  // calls a stale version closed over from the first render (which would
  // otherwise submit whatever answers existed when the timer first started,
  // i.e. none, instead of the student's real current answers).
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // the same idea for the rules: the interval always sees the latest values, never the first render's
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options.allowOvertime, options.rulesReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId) return; // nothing to time yet

    let isMounted = true; // guards against setting state after unmount
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function startTimer() {
      try {
        const info = await getSessionTimerInfo(sessionId!); // real duration + start time
        const totalSeconds = info.durationMinutes * 60; // convert minutes to seconds
        const joinedAtMs = new Date(info.joinedAt).getTime(); // when the session actually began

        // seconds left, from the real clock each time (negative once the limit has passed)
        const remainingNow = () => {
          const elapsedSeconds = Math.max(Math.floor((Date.now() - joinedAtMs) / 1000), 0); // never let clock skew make this negative
          return totalSeconds - elapsedSeconds;
        };

        if (!isMounted) return;
        setSecondsLeft(remainingNow());

        // Ticks every second, based on real elapsed time, not just a counter.
        intervalId = setInterval(() => {
          const remaining = remainingNow();
          const { allowOvertime, rulesReady } = optionsRef.current;

          if (remaining <= 0 && rulesReady && !allowOvertime) {
            // hard stop: show zero, stop ticking, and hand the attempt in (once)
            if (intervalId) clearInterval(intervalId);
            setSecondsLeft(0);
            if (!hasExpiredRef.current) {
              hasExpiredRef.current = true; // only fire the callback once
              onExpireRef.current(); // FIX — always the latest onExpire, never stale
            }
            return;
          }

          // Normal countdown, or overtime. Until the rules are known the clock never expires,
          // so a student who is allowed overtime is not handed in by mistake.
          setSecondsLeft(remaining);
        }, 1000);
      } catch (err) {
        console.error('useExamTimer failed to load session timer info:', err); // real error, not swallowed
        if (isMounted) setSecondsLeft(0); // fail safe: treat errors as time already up
      }
    }

    startTimer();

    return () => {
      isMounted = false; // cleanup if the screen unmounts
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId]);

  return secondsLeft;
}