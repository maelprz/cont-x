import { useCallback, useEffect, useRef } from "react";
import { createKeystrokeRecorder } from "../lib/keystrokeRecorder";
//import {logKeystrokeBatch} from '../services/keystrokeService';

const FLUSH_MS = 30000; //flush every 30 seconds
const JITTER_MS = 5000; //add 5 seconds to flush time, so students  dont all send together

type PendingBatch = {
  questionId: string;
  batch: string;
};

export function useKeystrokeRecorder(
  sessionId: string | null,
  questionId: string | null, //which question is showing on the screen, null if loading
) {
  const recorderRef = useRef<ReturnType<typeof createKeystrokeRecorder> | null>(
    null,
  ); //the recorder for this attempt
  const pendingRef = useRef<PendingBatch[]>([]); //batches waiting to be sent
  const chainRef = useRef<Promise<void>>(Promise.resolve()); //makes sure sends run one after another
  const questionIdRef = useRef<string | null>(questionId);
  questionIdRef.current = questionId; //update the current question id

  const queueBatch = useCallback((forQuestionId: string) => {
    const batch = recorderRef.current?.drain();
    if (batch) {
      pendingRef.current.push({ questionId: forQuestionId, batch });
    }
  }, []);

  const sendPending = useCallback((): Promise<void> => {
    if (!sessionId) return Promise.resolve(); //no session, nothing to send
    chainRef.current = chainRef.current.then(async () => {
      //wait for any earlier send to finish first
      while (pendingRef.current.length > 0) {
        //make sure list is empty
        const next = pendingRef.current[0]; //the oldest waiting batch
        let ok = false; //assume it failed until proven otherwise
        try {
          ok = await logKeystrokeBatch(sessionId, next.questionId, next.batch); //send it to the server
        } catch {
          ok = false; //network error, treat as failure
        }
        if (!ok) break; //stop if it failed, will try again later
        pendingRef.current.shift(); //saved already, remove from list
      }
    });
    return chainRef.current; //return the promise for this send
  }, [sessionId]);

  //useEffect 1: start a fresh recorder whenever a new exam attempt begins
  useEffect(() => {
    recorderRef.current = sessionId
      ? createKeystrokeRecorder(performance.now())
      : null; //start a new recorder
    pendingRef.current = []; //clear any pending batches
  }, [sessionId]);

  //useEffect 2: listen to keys and flush on a timer, once per (session, question)
  useEffect(() => {
    const recorder = recorderRef.current;
    if (!sessionId || !questionId || !recorder) return; //record only when exam screen shows

    const onDown = (e: KeyboardEvent) =>
      recorder.record(e.code, true, e.repeat); //key pressed
    const onUp = (e: KeyboardEvent) => recorder.record(e.code, false, e.repeat); //key released
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    const intervalMs = FLUSH_MS + Math.floor(Math.random() * JITTER_MS); //flush every 30-35 seconds
    const timerId = setInterval(() => {
      queueBatch(questionId);
      void sendPending(); //send any waiting batches, but don't wait for it to finish
    }, intervalMs);

    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      clearInterval(timerId);
      queueBatch(questionId); //flush any remaining events for this question
      void sendPending(); //send any waiting batches, but don't wait for it to finish
    };
  }, [sessionId, questionId, queueBatch, sendPending]);

  const flush = useCallback(async () => {
    if (questionIdRef.current) queueBatch(questionIdRef.current);
    await sendPending(); //wait for it to finish
  }, [queueBatch, sendPending]);

  return { flush }; //return the flush function to the caller
}
