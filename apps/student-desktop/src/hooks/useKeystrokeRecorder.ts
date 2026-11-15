import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { createKeystrokeRecorder } from "../lib/keystrokeRecorder";
import { logKeystrokeBatch, type KeystrokeQuestion } from "../services/keystrokeService";

const FLUSH_MS = 30_000;
const JITTER_MS = 5_000;
const FINAL_FLUSH_MS = 5_000;

function createAttempt(sessionId: string) {
  const recorder = createKeystrokeRecorder(performance.now());
  const pending: { id: string; question: KeystrokeQuestion; batch: string }[] = [];
  let sending: Promise<void> | null = null;

  return {
    record: recorder.record,
    queue(question: KeystrokeQuestion) {
      const batch = recorder.drain();
      if (batch) pending.push({ id: crypto.randomUUID(), question, batch });
    },
    send(): Promise<void> {
      if (!sending) {
        sending = (async () => {
          while (pending.length > 0) {
            const { id, question, batch } = pending[0];
            if (!(await logKeystrokeBatch(sessionId, id, question, batch))) return;
            pending.shift();
          }
        })().catch((error: unknown) => {
          console.warn("[keystrokeRecorder] Could not send queued batches.", error);
        }).finally(() => {
          sending = null;
        });
      }
      return sending;
    },
  };
}

export function useKeystrokeRecorder(
  sessionId: string | null,
  questionId: string | null,
  poolDrawId: string | null,
  isAnswerLocked: () => boolean,
) {
  const attempt = useMemo(() => sessionId ? createAttempt(sessionId) : null, [sessionId]);
  const drainCurrent = useRef<(() => void) | null>(null);
  const answerLocked = useRef(isAnswerLocked);

  useLayoutEffect(() => {
    answerLocked.current = isAnswerLocked;
  }, [isAnswerLocked]);

  useLayoutEffect(() => {
    const question = poolDrawId ? { poolDrawId } : questionId ? { questionId } : null;
    if (!attempt || !question) return;

    const queueCurrent = () => attempt.queue(question);
    drainCurrent.current = queueCurrent;
    const onKey = (event: KeyboardEvent) => {
      if (answerLocked.current() || !event.code) return;
      if (event.target instanceof HTMLInputElement && event.target.type === "password") return;
      attempt.record(event.code, event.type === "keydown", event.repeat);
    };

    // Capture keys before controls such as Monaco handle them.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    const interval = setInterval(() => {
      queueCurrent();
      void attempt.send();
    }, FLUSH_MS + Math.floor(Math.random() * JITTER_MS));

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      clearInterval(interval);
      drainCurrent.current = null;
      queueCurrent();
      void attempt.send();
    };
  }, [attempt, questionId, poolDrawId]);

  const flush = useCallback(async () => {
    if (!attempt) return;

    drainCurrent.current?.();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        attempt.send(),
        new Promise<void>((resolve) => { timer = setTimeout(resolve, FINAL_FLUSH_MS); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }, [attempt]);

  return { flush };
}
