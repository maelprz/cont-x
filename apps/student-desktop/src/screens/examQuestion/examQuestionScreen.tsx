import { Flag } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamSessionStore } from "../../stores/useExamSessionStore";
import { useExamQuestions } from "../../hooks/useExamQuestions"; 
import { useExamTimer } from "../../hooks/useExamTimer"; 
import { useQuestionTimeTracker } from "../../hooks/useQuestionTimeTracker"; 
import { useSessionRules } from "../../hooks/useSessionRules"; 
import { SubmitConfirmationModal } from "../../components/modals/submitConfirmationModal"; 
import { useCodeExecution } from "../../hooks/useCodeExecution"; 
import { MultipleChoiceOptions } from "../../components/examQuestion/multipleChoiceOptions";
import { QuestionAnswerSplit } from "../../components/examQuestion/questionAnswerSplit";
import { QuestionMapGrid } from "../../components/examQuestion/questionMapGrid";
import { CodeEditor } from "../../components/examQuestion/codeEditor";
import { useSubmitExamSession } from "../../hooks/useSubmitExamSession";
import type { SessionTiming, SubmittedAnswer } from "../../services/examService";
import { countAnsweredQuestions, hasQuestionAnswer } from "../../lib/examProgress";
import { AnswerChangeTracker } from "../../lib/answerChanges";
import { useViolationLogger } from "../../hooks/useViolationLogger"; 
import { useRemovalWatcher } from "../../hooks/useRemovalWatcher"; 
import { useLiveStateReporter } from "../../hooks/useLiveStateReporter"; 
import { checkIfRemoved, getSessionStatus } from "../../services/removalService";
import { useMovementEvents } from "../../hooks/useMovementEvents"; 
import { useKeystrokeRecorder } from "../../hooks/useKeystrokeRecorder";
import { useOfflineDraft } from "../../hooks/useOfflineDraft";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { finishOfflineExam } from "../../services/offlineExamService";
import type { OfflineExamSnapshot, OfflineSubmission } from "../../types/offlineExam";

import type {
  ExamQuestionScreenProps,
  QuestionMapItem,
  CodingQuestion,
  FITBQuestion,
  MCQQuestion,
  Question,
} from "./examQuestionScreen.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const submitButtonClass =
  "flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#adc6ff] bg-[#adc6ff] text-[#00285d] text-[13px] font-bold cursor-pointer shadow-[0_0_20px_rgba(173,198,255,0.25)] transition-all duration-150 hover:bg-[#c5d7ff] hover:border-[#c5d7ff] hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(173,198,255,0.45)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 disabled:hover:bg-[#adc6ff] disabled:hover:border-[#adc6ff]";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sameExamTiming(left: SessionTiming, right: SessionTiming): boolean {
  return left.normalDeadline === right.normalDeadline && left.hardDeadline === right.hardDeadline &&
    left.forceSubmit === right.forceSubmit && left.sessionStatus === right.sessionStatus &&
    left.classExamStatus === right.classExamStatus && left.allowOvertime === right.allowOvertime &&
    left.overtimeMinutes === right.overtimeMinutes && left.overtimeDeduction === right.overtimeDeduction &&
    left.durationMinutes === right.durationMinutes;
}

function localDeadline(snapshot?: Pick<OfflineExamSnapshot, "timing" | "timingReceivedAt"> | null): number {
  if (!snapshot) return Infinity;
  const { timing, timingReceivedAt } = snapshot;
  const deadline = timingReceivedAt + Date.parse(timing.hardDeadline) - Date.parse(timing.serverNow);
  return timing.forceSubmit ? Math.min(timingReceivedAt, deadline) : deadline;
}

export function ExamQuestionScreen({
  onNavigate,
  onFlag,
  onAnswerSelect,
  onCodeChange,
  onPrevious,
  onNext,
  onSubmit,
  onExamTimingRefreshed,
}: ExamQuestionScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const examTitle = useExamSessionStore((state) => state.examTitle) ?? ""; // real exam title
  const sessionId = useExamSessionStore((state) => state.sessionId); // real session id, needed for the timer
  const savedExam = useExamSessionStore((state) => state.offlineExam);
  const draft = savedExam?.draft;
  const deadlineRef = useRef(localDeadline(savedExam));
  const savedTiming = useRef(savedExam ? { timing: savedExam.timing, receivedAt: savedExam.timingReceivedAt } : null);
  const closed = useRef(false);
  const legacySubmission = savedExam?.pendingSubmission ? undefined : savedExam?.gradingState?.submission;
  const [pendingSubmission, setPendingSubmission] = useState(Boolean(savedExam?.pendingSubmission || legacySubmission));
  const [submissionStored, setSubmissionStored] = useState(Boolean(savedExam?.pendingSubmission));
  const pendingRef = useRef<OfflineSubmission | null>(savedExam?.pendingSubmission ?? null);
  const removed = useExamSessionStore((state) => state.removed); // stop reporting once the teacher removed this student
  const questionIdRef = useRef<string | null>(null);
  useRemovalWatcher(savedExam ? null : sessionId);
  const {
    questions: fetchedQuestions,
    isLoading,
    error,
  } = useExamQuestions(sessionId, savedExam?.questions);
  const { submitSession, isSubmitting, error: submissionError, clearError: clearSubmissionError } = useSubmitExamSession();
  const submissionInFlightRef = useRef(false);
  const timedOutAnswersRef = useRef<SubmittedAnswer[] | null>(null);
  const answersLocked = () => closed.current || Boolean(pendingRef.current) ||
    submissionInFlightRef.current || timedOutAnswersRef.current !== null || Date.now() >= deadlineRef.current;

  const finish = (status: "result" | "removed") => {
    if (closed.current) return;
    closed.current = true;
    if (savedExam) finishOfflineExam({ studentId: savedExam.studentId, sessionId: savedExam.sessionId });
    if (status === "removed") useExamSessionStore.getState().markRemoved();
    else {
      onSubmit?.();
      navigateTo("examResult");
    }
  };

  // Retain exactly the answers present at the deadline if the network requires a retry.
  const handleTimeExpired = async (deadlineLocalMs: number) => {
    if (savedExam && (closed.current || pendingRef.current || pendingSubmission)) return;
    timedOutAnswersRef.current = buildAnswers(deadlineLocalMs);
    setShowSubmitConfirm(false);
    if (savedExam) await saveSubmission("timed_out", timedOutAnswersRef.current, deadlineLocalMs);
    else await submitAndLeave();
  };

  const { rules, isLoaded: rulesLoaded, error: rulesError, retry: retryRules } = useSessionRules(sessionId, savedExam?.rules);
  // Hard stop by default: at zero the answers are submitted automatically. With overtime allowed the clock keeps running past zero.
  const timer = useExamTimer(sessionId, handleTimeExpired, {
    allowOvertime: rules.allowOvertime,
    rulesReady: rulesLoaded,
    savedExam: savedExam ?? undefined,
    onTimeRestored: () => {
      if (submissionInFlightRef.current || pendingRef.current) return false;
      timedOutAnswersRef.current = null;
      clearSubmissionError();
      return true;
    },
    onServerTiming: (timing, receivedAt) => {
      if (!savedExam) return;
      deadlineRef.current = localDeadline({ timing, timingReceivedAt: receivedAt });
      const key = { studentId: savedExam.studentId, sessionId: savedExam.sessionId };
      onExamTimingRefreshed?.(key, timing);
      if (timing.sessionStatus === "removed") { finish("removed"); return; }
      if (timing.sessionStatus === "submitted" || timing.sessionStatus === "timed_out") { finish("result"); return; }
      if (!savedTiming.current || !sameExamTiming(savedTiming.current.timing, timing)) {
        void window.ipcRenderer.updateOfflineTiming(key, timing, receivedAt).then(() => {
          if (!savedTiming.current || savedTiming.current.receivedAt < receivedAt) {
            savedTiming.current = { timing, receivedAt };
          }
        }).catch(() => { /* Retry this timing update on the next server refresh. */ });
      }
    },
  }); // real countdown, ticks every second
  const timeLeftSeconds = timer.secondsLeft;

  // NEW - real Run Tests / Run Code state and actions
  const {
    isRunning,
    testsResult,
    codeResult,
    runError,
    handleRunTests: runTests,
    handleRunCode: runCode,
    clearResults,
  } = useCodeExecution();

  const sync = useOfflineSync(savedExam, (outcome) => {
    if (outcome !== "extended") {
      finish(outcome);
      return;
    }
    pendingRef.current = null;
    timedOutAnswersRef.current = null;
    setPendingSubmission(false);
    setSubmissionStored(false);
  }, () => setSubmissionStored(true));
  const queueOffline = savedExam ? sync.enqueue : undefined;
  useViolationLogger(pendingSubmission ? null : sessionId, questionIdRef, queueOffline);

  // Tracks which question is currently shown, by position in the loaded list.
  const [currentIndex, setCurrentIndex] = useState(draft?.currentIndex ?? 0);
  // WBS 6.7: how long the student spends on each question (only while it is on screen and the window is in front)
  const { getTimes, getTimesMs } = useQuestionTimeTracker(
    pendingSubmission ? null : fetchedQuestions[currentIndex]?.id ?? null, draft?.questionTimesMs,
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // the "are you sure?" step before submitting
  // The output panel height is kept here so it survives moving between questions (undefined = use the editor's default)
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);
  // WBS 8.13 / 8.16: when each answer was last changed, how many times it was changed after first being given,
  // and the last answer the student settled on (used to tell a real change from the first answer)
  const answeredAtRef = useRef<Record<string, string>>({ ...draft?.answeredAt });
  const changeTrackerRef = useRef(new AnswerChangeTracker(draft?.answerChanges));
  useEffect(() => {
    const current = fetchedQuestions[currentIndex];
    questionIdRef.current = current && !current.poolDrawId ? current.id : null; // null while loading, and for pooled questions (their id is a draw, not a question)
  }, [fetchedQuestions, currentIndex]);
  const [flaggedIds, setFlaggedIds] = useState(() => new Set(draft?.flaggedIds));
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(draft?.selectedOptions ?? {});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(draft?.textAnswers ?? {});
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>(
    draft?.codeByQuestion ?? {},
  );
  const captureDraft = () => ({
    currentIndex, flaggedIds: [...flaggedIds], selectedOptions, textAnswers, codeByQuestion,
    answeredAt: answeredAtRef.current, answerChanges: changeTrackerRef.current.snapshot(),
  });
  const draftError = useOfflineDraft(savedExam, captureDraft(), getTimesMs, pendingSubmission);

  // Builds the question map (sidebar grid) from the real fetched list.
  // Same idea as the "answered" status in the map: something was selected, typed or written.
  const answers = { selectedOptions, textAnswers, codeByQuestion };
  const isAnswered = (id: string) => {
    const current = fetchedQuestions.find((q) => q.id === id);
    return current !== undefined && hasQuestionAnswer(current, answers);
  };

  const liveQuestion = fetchedQuestions[currentIndex]; 
  const reportingEnabled = !isLoading && !removed && !pendingSubmission && fetchedQuestions.length > 0;
  const processMonitoringEnabled = Boolean(sessionId && !removed && !pendingSubmission && timer.timing?.sessionStatus === "in_progress");
  const recordKeystrokes = processMonitoringEnabled && rulesLoaded && !isLoading && !error;
  const { flush: flushKeystrokes } = useKeystrokeRecorder(
    sessionId,
    recordKeystrokes && liveQuestion && !liveQuestion.poolDrawId ? liveQuestion.id : null,
    recordKeystrokes ? liveQuestion?.poolDrawId ?? null : null,
    answersLocked,
    queueOffline,
  );
  useEffect(() => {
    if (!processMonitoringEnabled) return;
    window.ipcRenderer?.setExamProcessMonitoring(true);
    return () => window.ipcRenderer?.setExamProcessMonitoring(false);
  }, [sessionId, processMonitoringEnabled]);
  const reportedQuestionId = liveQuestion && !liveQuestion.poolDrawId ? liveQuestion.id : null; 
  const reportedPosition = fetchedQuestions.length > 0 ? currentIndex + 1 : null; 
  useLiveStateReporter({
    sessionId, 
    enabled: reportingEnabled,
    questionId: reportedQuestionId, 
    position: reportedPosition, 
    total: fetchedQuestions.length > 0 ? fetchedQuestions.length : null, 
    answeredCount: countAnsweredQuestions(fetchedQuestions, answers),
    queueOffline,
  });
  const { flushNow: flushMovementEvents } = useMovementEvents({
    sessionId,
    enabled: reportingEnabled, 
    questionId: reportedQuestionId, 
    position: reportedPosition, 
    queueOffline,
  });

  // In-order exams: the first question with no answer yet. Nothing past it can be opened.
  const firstUnansweredIndex = (() => {
    const index = fetchedQuestions.findIndex((q) => !isAnswered(q.id));
    return index === -1 ? Math.max(fetchedQuestions.length - 1, 0) : index;
  })();

  // In-order exams: "Next" stays off until the question on screen has an answer.
  const nextBlocked = rules.sequential && !isAnswered(fetchedQuestions[currentIndex]?.id ?? "");

  const questionMap: QuestionMapItem[] = useMemo(
    () =>
      fetchedQuestions.map((q, i) => ({
        number: i + 1, // display position, not the database id
        sectionTitle: q.sectionTitle ?? undefined, // lets the map show section headings
        locked: rules.sequential && i > firstUnansweredIndex, // in-order exams: nothing past the first unanswered question
        flagged: flaggedIds.has(q.id),
        status: hasQuestionAnswer(q, { selectedOptions, textAnswers, codeByQuestion })
            ? "answered"
            : "unanswered",
      })),
    [fetchedQuestions, flaggedIds, selectedOptions, codeByQuestion, textAnswers, rules.sequential, firstUnansweredIndex],
  );

  // Converts the current fetched question into the shape the existing UI expects.
  const question: Question | null = useMemo(() => {
    const raw = fetchedQuestions[currentIndex]; // the question at the current position
    if (!raw) return null; // nothing loaded yet, or index out of range

    const shared = {
      number: currentIndex + 1, // 1-based display number
      totalQuestions: fetchedQuestions.length, // real count of loaded questions
      title: raw.title || `Question ${currentIndex + 1}`,
      body: raw.prompt,
      isFlagged: flaggedIds.has(raw.id),
      sectionTitle: raw.sectionTitle ?? undefined, // shown above the title when the exam has sections
    };

    if (raw.type === "fitb") {
      return {
        ...shared,
        type: "fill-in-blank",
        answerText: textAnswers[raw.id] ?? "", // what was typed so far
      } as FITBQuestion;
    }

    if (raw.type === "coding") {
      return {
        ...shared,
        type: "coding",
        starterCode: raw.starterCode ?? "",
        language: raw.language ?? "c",
        programType: raw.programType ?? "cProgram", // NEW
        mainCode: raw.mainCode ?? undefined, // NEW
        checkPenaltyPerAttempt: raw.checkPenaltyPerAttempt ?? 0, // NEW
      } as CodingQuestion;
    }

    return {
      ...shared,
      type: "multiple-choice",
      options: (raw.options ?? []).map((opt, i) => ({
        id: opt.id, // real UUID, still used for selection/scoring
        text: opt.text,
        displayLetter: String.fromCharCode(65 + i), // A, B, C, D... based on position
      })),
      selectedOptionId: selectedOptions[raw.id],
    } as MCQQuestion;
  }, [fetchedQuestions, currentIndex, flaggedIds, selectedOptions, textAnswers]);

  // Local MCQ selection state, mirrors the current question's saved choice.
  const [localSelectedOption, setLocalSelectedOption] = useState<
    string | undefined
  >(undefined);

  // Local code text, mirrors the current question's saved code.
  const [localCode, setLocalCode] = useState<string>("");

  // Re-syncs local state when the student moves to a DIFFERENT question, so switching
  // questions shows the real saved answer instead of the last one typed.
  // This runs on a change of question id only. It used to run whenever the question object
  // changed, which also happens when the flag is toggled or another answer is typed, and that
  // wiped the editor back to the starter code and cleared the Run Tests/Run Code output.
  const currentQuestionId = fetchedQuestions[currentIndex]?.id ?? null;
  const hasQuestion = question !== null;
  useEffect(() => {
    if (!question || !currentQuestionId) return; // nothing loaded yet
    setLocalSelectedOption(
      question.type === "multiple-choice"
        ? question.selectedOptionId
        : undefined,
    );
    setLocalCode(
      question.type === "coding"
        ? (codeByQuestion[currentQuestionId] ?? question.starterCode ?? "") // what the student already wrote, or the starter code the first time
        : "",
    );
    clearResults(); // NEW - don't show the previous question's Run Tests/Run Code output
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed to the question id only (see above)
  }, [currentQuestionId, hasQuestion]);

  const handleOptionSelect = (id: string) => {
    if (answersLocked()) return;
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const questionId = fetchedQuestions[currentIndex].id;
    answeredAtRef.current[questionId] = new Date().toISOString();
    setLocalSelectedOption(id);
    setSelectedOptions((prev) => ({
      ...prev,
      [fetchedQuestions[currentIndex].id]: id,
    })); // remember this choice
    onAnswerSelect?.(question.number, id);
  };

  const handleClearOption = () => {
    if (answersLocked()) return;
    if (!fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const id = fetchedQuestions[currentIndex].id;
    answeredAtRef.current[id] = new Date().toISOString();
    setLocalSelectedOption(undefined); // clear the visible selection
    setSelectedOptions((prev) => {
      const next = { ...prev }; // copy so we don't mutate state directly
      delete next[id]; // remove this question's saved choice
      return next;
    });
  };

  // fill-in-the-blank: remember what was typed for the current question
  const handleTextChange = (text: string) => {
    if (answersLocked()) return;
    if (!fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const id = fetchedQuestions[currentIndex].id;
    answeredAtRef.current[id] = new Date().toISOString();
    setTextAnswers((prev) => ({ ...prev, [id]: text }));
  };

  const handleCodeChange = (code: string) => {
    if (answersLocked()) return;
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    answeredAtRef.current[fetchedQuestions[currentIndex].id] = new Date().toISOString();
    setLocalCode(code);
    setCodeByQuestion((prev) => ({
      ...prev,
      [fetchedQuestions[currentIndex].id]: code,
    })); // remember this code
    onCodeChange?.(question.number, code);
  };

  // NEW - runs only the visible test cases, pure feedback, no writes.
  const handleRunTests = () => {
    if (answersLocked()) return;
    const raw = fetchedQuestions[currentIndex];
    if (!raw || raw.type !== "coding") return; // guard, only coding questions can run tests
    runTests(
      raw.id,
      localCode,
      raw.programType ?? "cProgram",
      raw.mainCode ?? undefined,
      Boolean(raw.poolDrawId), // a pooled question reads its tests through the pool function
      savedExam?.visibleTests?.[raw.id],
    );
  };

  // NEW - runs every test case, writes logs, and updates the real running score.
  const handleRunCode = () => {
    if (answersLocked()) return;
    const raw = fetchedQuestions[currentIndex];
    if (!raw || raw.type !== "coding" || !sessionId) return; // guard, needs a real session to attribute the answer to
    runCode(
      sessionId,
      raw.id,
      localCode,
      raw.programType ?? "cProgram",
      raw.mainCode ?? undefined,
      raw.maxPoints,
      raw.checkPenaltyPerAttempt ?? 0,
      Boolean(raw.poolDrawId),
    );
  };

  const handleFlag = () => {
    if (answersLocked()) return;
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const id = fetchedQuestions[currentIndex].id;
    setFlaggedIds((prev) => {
      const next = new Set(prev); // copy so we don't mutate state directly
      next.has(id) ? next.delete(id) : next.add(id); // toggle this question's flag
      return next;
    });
    onFlag?.(question.number);
  };

  const answerValueOf = (q: (typeof fetchedQuestions)[number]): string =>
    q.type === "mcq" ? (selectedOptions[q.id] ?? "") : (textAnswers[q.id] ?? "").trim();

  // Commit the answer on leaving; only a subsequent visit can incur a deduction.
  const settleCurrentAnswer = () => {
    const current = fetchedQuestions[currentIndex];
    if (!current || current.type === "coding") return;
    changeTrackerRef.current.leave(current.id, answerValueOf(current));
  };

  const handleNavigate = (n: number) => {
    if (answersLocked()) return;
    if (n - 1 === currentIndex) return;
    if (rules.sequential && n - 1 > firstUnansweredIndex) return; // in-order exams: cannot jump past an unanswered question
    settleCurrentAnswer();
    setCurrentIndex(n - 1); // convert 1-based display number to array index
    onNavigate?.(n);
  };

  const handlePrevious = () => {
    if (answersLocked()) return;
    settleCurrentAnswer();
    setCurrentIndex((i) => Math.max(i - 1, 0)); // never go below the first question
    onPrevious?.();
  };

  const handleNext = () => {
    if (answersLocked()) return;
    if (nextBlocked) return; // in-order exams: this question has to be answered first
    settleCurrentAnswer();
    setCurrentIndex((i) => Math.min(i + 1, fetchedQuestions.length - 1)); // never go past the last question
    onNext?.();
  };


  // WBS 8.16: how many times this answer was changed. Multiple choice and fill-in-the-blank only; for a fill-in-the-blank
  // that is still on screen, a different answer than the one last settled counts as one more.
  const changeCountOf = (q: (typeof fetchedQuestions)[number]): number => {
    return q.type === "coding" ? 0 : changeTrackerRef.current.count(q.id, answerValueOf(q));
  };

  function buildAnswers(asOf?: number): SubmittedAnswer[] {
    const times = getTimes(asOf);
    return fetchedQuestions.map((q) => ({
      question_id: q.poolDrawId ? null : q.id, // real question id; none for a pooled question
      pool_draw_id: q.poolDrawId, // the draw id for a pooled question, otherwise null
      time_spent_seconds: times[q.id] ?? 0, // WBS 6.7
      change_count: changeCountOf(q), // WBS 8.16
      answered_at: answeredAtRef.current[q.id] ?? null, // WBS 8.13: when it was last changed
      answer_text:
        q.type === "coding"
          ? (codeByQuestion[q.id] ?? "") // whatever code was typed, or empty if untouched
          : q.type === "fitb"
            ? (textAnswers[q.id] ?? "") // whatever was typed in the blank, or empty if untouched
            : (selectedOptions[q.id] ?? ""), // whichever option id was picked, or empty if unanswered
    }));
  }

  const handleOnSubmit = async () => {
    try {
      if (!savedExam) await submitAndLeave();
      else if (Date.now() >= deadlineRef.current) await handleTimeExpired(deadlineRef.current);
      else await saveSubmission("submitted", buildAnswers());
    } finally {
      setShowSubmitConfirm(false);
    }
  };

  async function saveSubmission(status: OfflineSubmission["status"], answers: SubmittedAnswer[], requestedAt = Date.now()) {
    if (pendingRef.current || closed.current) return;
    const submission = {
      status, answers,
      draft: { ...captureDraft(), questionTimesMs: getTimesMs(requestedAt) },
    };
    pendingRef.current = submission;
    setPendingSubmission(true);
    // The recorder drains synchronously into the same local write queue before the submission.
    await flushKeystrokes();
    try {
      await sync.enqueue({ kind: "submit", submission }, new Date(requestedAt).toISOString());
      void sync.retry();
    } catch {
      // The queue keeps the frozen submission and retries the local write.
    }
  }

  useEffect(() => {
    if (legacySubmission) {
      void saveSubmission(legacySubmission.status, legacySubmission.answers, Date.parse(legacySubmission.submittedAt));
    }
    // Import the previously graded submission when the attempt is first restored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacySubmission]);

  const submitAndLeave = async () => {
    if (!sessionId || submissionInFlightRef.current) return;
    submissionInFlightRef.current = true; 
    try {
      await Promise.all([flushMovementEvents(1500), flushKeystrokes()]);
      const result = await submitSession(
        sessionId,
        timedOutAnswersRef.current ? "timed_out" : "submitted",
        timedOutAnswersRef.current ?? buildAnswers(),
      );
      if (!result) {
        // Removal has its own screen. A failed status check must retain the exam too.
        try {
          const status = await getSessionStatus(sessionId);
          if (status === "submitted" || status === "timed_out") { finish("result"); return; }
          if (status === "removed") {
            if (savedExam) finish("removed");
            else await checkIfRemoved(sessionId);
          }
        } catch { /* the submission error stays visible */ }
        return;
      }
      finish("result");
    } finally {
      submissionInFlightRef.current = false;
    }
  };

  if (pendingSubmission) {
    if (!sync.showLocalResult) {
      return <div className="h-screen flex flex-col gap-3 items-center justify-center bg-white text-[#101828]" role="status">
        <h1 className="text-2xl font-semibold">Submitting exam…</h1>
        <p className="text-sm">Saving your submission and loading your result.</p>
      </div>;
    }
    const localGrade = sync.submission;
    const maxScore = fetchedQuestions.reduce((sum, question) => sum + question.maxPoints, 0);
    return (
      <div className="h-screen overflow-y-auto flex flex-col gap-5 items-center justify-center p-6 text-[#101828] bg-white">
        <h1 className="text-2xl font-semibold">{localGrade ? "Exam submitted" : "Submitting exam"}</h1>
        {localGrade && <section aria-label="Local exam result" className="w-full max-w-xl rounded-xl border border-stone-200 p-6">
          <p className="text-sm">{examTitle} · Local score</p>
          <p className="mt-3 text-5xl font-bold" role="status">{localGrade.totalScore}<span className="text-2xl"> / {maxScore}</span></p>
          <table className="mt-6 w-full text-left text-sm">
            <thead><tr className="border-b border-stone-200"><th className="pb-2">Question</th><th className="pb-2 text-right">Points</th></tr></thead>
            <tbody>{fetchedQuestions.map((question, index) => {
              const answer = localGrade.answers.find((answer) => (answer.pool_draw_id ?? answer.question_id) === question.id);
              return <tr key={question.id} className="border-b border-stone-200"><td className="py-3">{question.title ?? `Question ${index + 1}`}</td><td className="py-3 text-right">{answer?.score ?? 0} / {question.maxPoints}</td></tr>;
            })}</tbody>
          </table>
          {localGrade.overtimeDeduction > 0 && <p className="mt-3 text-sm">Overtime deduction: {localGrade.overtimeDeduction} points.</p>}
        </section>}
        <p role="status">{sync.gradeSaved ? "Pending sync" : submissionStored ? "Grading locally" : "Saving submission locally"}</p>
        <p className="max-w-xl text-center text-sm">{sync.error ?? (sync.gradeSaved
          ? "Your score and submission are saved on this device. Sync will retry automatically when you reconnect. Teacher adjustments will appear after sync."
          : "Your exam is locked. Grading can finish without an internet connection.")}</p>
        <button type="button" className="rounded-lg border border-[#101828] bg-white px-5 py-2.5 text-sm font-semibold text-[#101828] cursor-pointer transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101828]" onClick={() => void sync.retry()}>Retry sync</button>
      </div>
    );
  }

  // A settings failure must not silently turn off sequential or other exam rules.
  if (!rulesLoaded) {
    return (
      <div className="h-screen w-full flex flex-col gap-4 items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
        <p role={rulesError ? "alert" : "status"}>{rulesError ?? "Loading exam settings..."}</p>
        {rulesError && <button type="button" onClick={retryRules} className="px-4 py-2 rounded border border-[var(--border-primary)]">Retry settings</button>}
      </div>
    );
  }

  if (!timer.timing) {
    return <div className="h-screen flex flex-col gap-4 items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
      <p role={timer.error ? "alert" : "status"}>{timer.error ?? "Loading exam timer..."}</p>
      {timer.error && <button type="button" onClick={timer.retry}>Retry timer</button>}
    </div>;
  }

  // Show a simple loading state while questions are being fetched.
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
        Loading exam questions...
      </div>
    );
  }

  // Show a simple error state if the fetch failed or nothing came back.
  if (error || !question) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
        {error ?? "No questions found for this exam."}
      </div>
    );
  }

  const progressCurrent = countAnsweredQuestions(fetchedQuestions, answers);
  const progressTotal = fetchedQuestions.length; // real total question count

  const progressPct = Math.round((progressCurrent / progressTotal) * 100);
  const isCoding = question.type === "coding";
  const isLastQuestion = question.number >= question.totalQuestions;
  const isOvertime = timeLeftSeconds !== null && timeLeftSeconds < 0; // the limit has passed and the teacher allows overtime
  const codingQ = isCoding ? (question as CodingQuestion) : null;
  const mcqQ = question.type === "multiple-choice" ? (question as MCQQuestion) : null;
  const fitbQ = question.type === "fill-in-blank" ? (question as FITBQuestion) : null;

  const questionPane = (
    <section
      className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white"
    >
      <div className="shrink-0 border-b border-stone-200 bg-[#f8f8f8] px-5 py-3 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-[#e9eee3] px-2.5 py-1 text-xs font-semibold text-[#465a3b]">Question {question.number} of {question.totalQuestions}</span>
          <button type="button" aria-label={question.isFlagged ? "Unflag question" : "Flag question"} aria-pressed={question.isFlagged ?? false}
            title={question.isFlagged ? "Remove flag" : "Flag for review"} onClick={handleFlag}
            className={"flex shrink-0 cursor-pointer items-center justify-center rounded-lg border p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 " + (question.isFlagged ? 'border-red-400 bg-red-100 text-red-700' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100')}>
            <Flag size={14} aria-hidden="true" className={question.isFlagged ? "fill-current" : ""} />
          </button>
        </div>
        <p className="mb-1 break-words text-[11px] text-stone-500">
          {question.sectionTitle && <>{question.sectionTitle} · </>}
          {isCoding ? "Coding" : mcqQ ? "Multiple choice" : "Fill in the blank"}
        </p>
        <h2 className="break-words text-lg font-semibold leading-snug tracking-tight text-stone-900">{question.title}</h2>
      </div>
      {/* Question body */}
      <div className="min-w-0 px-5 py-5 sm:px-6">
        <p className="mb-5 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">
          {question.body}
        </p>

        {/* Coding: code snippet example */}
        {isCoding && codingQ?.codeSnippet && (
          <div className="rounded-lg p-4 mb-5 font-mono text-xs leading-relaxed overflow-x-auto bg-stone-50 border border-stone-200">
            {codingQ.codeSnippet.split("\n").map((line, i) => {
              const isComment = line.trim().startsWith("//");
              const isNote = line.trim().startsWith("(");
              return (
                <div
                  key={i}
                  className={
                    isComment
                      ? "text-stone-500"
                      : isNote
                        ? "text-stone-500 italic"
                        : "text-stone-800"
                  }
                >
                  {line || "\u00A0"}
                </div>
              );
            })}
          </div>
        )}

        {/* Coding: constraints */}
        {isCoding && codingQ?.constraints && (
          <>
            <p className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-secondary)] mb-3">
              Constraints
            </p>
            <ul className="flex flex-col gap-2">
              {codingQ.constraints.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--border-primary)] flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );

  const answerPane = (
    <section aria-label="Answer" className="min-w-0 overflow-y-auto border-t border-[var(--border-primary)] px-6 py-5 sm:border-t-0">
      {/* Fill in the blank: one text box */}
      {fitbQ && (
        <div className="w-full min-w-0 rounded-xl border border-stone-200 bg-[#f8f8f8] p-4 sm:p-5">
          <label
            htmlFor="fitb-answer"
            className="mb-1 block text-sm font-semibold text-stone-900"
          >
            Your answer
          </label>
          <p id="fitb-answer-help" className="mb-4 text-xs leading-relaxed text-stone-500">
            Enter the missing word or phrase.
          </p>
          <input
            id="fitb-answer"
            type="text"
            value={fitbQ.answerText ?? ""}
            onChange={(e) => handleTextChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="fitb-answer-help"
            placeholder="Type your answer"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-[#465a3b] focus:outline-2 focus:outline-offset-2 focus:outline-[#465a3b]"
          />
        </div>
      )}

      {/* MCQ: options */}
      {mcqQ && (
        <div className="mx-auto w-full max-w-3xl">
          <h3 className="text-sm font-semibold text-stone-900">Your answer</h3>
          <p className="mb-4 mt-1 text-xs text-stone-500">Select one option below.</p>
        <MultipleChoiceOptions
          options={mcqQ.options}
          className="mt-0"
          selectedId={localSelectedOption}
          onSelect={handleOptionSelect}
          onClear={handleClearOption}
        />
        </div>
      )}
    </section>
  );

  const codePane = codingQ && (
    <section className="flex-grow flex flex-col overflow-hidden bg-[var(--bg-app)] min-w-0">
      <CodeEditor
        code={localCode}
        language={codingQ.language ?? "c"}
        onChange={handleCodeChange}
        onRunTests={handleRunTests}
        onRunCode={handleRunCode}
        isRunning={isRunning}
        testsResult={testsResult}
        codeResult={codeResult}
        runError={runError}
        panelHeight={panelHeight}
        onPanelHeightChange={setPanelHeight}
      />
    </section>
  );

  return (
    <div className="h-screen w-full flex flex-col text-[var(--text-primary)] overflow-hidden bg-[var(--bg-sidebar)]">
      {/* Top navigation bar */}
      <header className="h-14 flex-shrink-0 flex items-center px-6 border-b border-[var(--border-primary)] backdrop-blur-md z-10 bg-[var(--bg-sidebar)]">
        <div className="flex items-center justify-between w-full gap-4">
          {/* Brand */}
          <div className="flex flex-row items-center gap-5 flex-shrink-0">
            <span className="text-[var(--text-inverted)] text-lg font-bold tracking-tight">
              Cont/x
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-inverted-secondary)]">
              {examTitle}
            </span>
            {savedExam && (
              <span role="status" className="text-xs text-[var(--text-inverted-secondary)]">
                Offline ready
              </span>
            )}
          </div>
          {/* Progress */}
          <div className="flex flex-col items-center gap-1 flex-grow max-w-xs">
            <span className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)]">
              Assessment Progress
            </span>
            <div
              role="progressbar"
              aria-label="Assessment progress"
              aria-valuemin={0}
              aria-valuemax={progressTotal}
              aria-valuenow={progressCurrent}
              aria-valuetext={`${progressCurrent} of ${progressTotal} questions answered`}
              className="w-full h-1.5 bg-[var(--bg-app)] rounded-full overflow-hidden grid grid-cols-[repeat(100,minmax(0,1fr))]"
            >
              {Array.from({ length: 100 }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < progressPct
                      ? "rounded-full bg-[var(--text-secondary)]"
                      : "rounded-full bg-transparent"
                  }
                />
              ))}
            </div>
          </div>

          {/* Timer, height capped to fit header row. Shows real remaining time, or "--:--:--" while it's still loading. */}
          <div className="flex items-center gap-2 px-3 rounded-lg border border-[var(--border-subtle)] flex-shrink-0 h-9">
            <div className="flex flex-col items-end justify-center leading-none">
              <span className="font-mono text-[8px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)]">
                {isOvertime ? "Overtime" : "Time Left"}
              </span>
              <span
                className={`font-mono text-[15px] font-bold leading-tight tracking-tight ${
                  isOvertime ? "text-[var(--warning-icon)]" : "text-[var(--text-inverted)]"
                }`}
              >
                {timeLeftSeconds !== null
                  ? `${isOvertime ? "+" : ""}${formatTime(Math.abs(timeLeftSeconds))}`
                  : "--:--:--"}
              </span>
            </div>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#adc6ff"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* Body: sidebar and content */}
      <div className="flex flex-grow overflow-hidden">
        <QuestionAnswerSplit
          question={questionPane}
          answer={isCoding && codingQ ? codePane : answerPane}
        />
        {/* Right sidebar: question map */}
        <aside className="w-[105px] lg:w-[180px] flex-shrink-0 flex flex-col border-l border-[var(--border-primary)] bg-[var(--bg-sidebar)] overflow-y-auto">
          <div className="p-2 lg:p-4 flex-grow">
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--text-inverted-secondary)] mb-3">
              Question Map
            </p>
            <QuestionMapGrid
              items={questionMap}
              currentNumber={question.number}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Legend */}
          <div aria-live="polite" className="px-2 pb-4 flex flex-col gap-2 border-t border-[var(--border-primary)] pt-3 lg:px-4">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm border border-[#424754] bg-[#1c2b3c]" />
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">
                Answered: {progressCurrent}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Flag size={12} className="shrink-0 fill-current text-[var(--warning-icon)]" aria-hidden="true" />
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">
                Flagged: {flaggedIds.size}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {(draftError || sync.error) && (
        <div role="alert" className="px-6 py-3 bg-[var(--bg-app)] text-[var(--text-primary)]">
          {draftError ? "Could not save your draft to local storage. Retrying." : sync.error}
        </div>
      )}

      {submissionError && (
        <div role="alert" className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 bg-[var(--bg-app)] text-[var(--text-primary)]">
          <p>{submissionError}{timedOutAnswersRef.current ? " Time is up; your deadline answers are retained for retry." : " Your answers are still here."}</p>
          <button type="button" onClick={handleOnSubmit} disabled={isSubmitting} className="px-4 py-2 rounded border border-[var(--border-primary)] disabled:opacity-50">
            {isSubmitting ? "Submitting..." : "Retry submission"}
          </button>
        </div>
      )}

      {/* Bottom action bar */}
      <footer className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-t border-[var(--border-primary)] backdrop-blur-sm bg-[var(--bg-sidebar)]">
        {/* Previous */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={question.number <= 1}
            className={footerButtonClass}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Previous
          </button>
        </div>

        {/* Auto-save indicator */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[#8c909f]">
              Auto-Save Active
            </span>
          </div>
          {isOvertime && (
            <span className="font-mono text-[10px] text-[var(--warning-icon)]">
              Overtime: {timer.timing.overtimeDeduction} points deducted once; up to {timer.timing.overtimeMinutes} extra minutes.
            </span>
          )}
          {!isLastQuestion && nextBlocked && (
            <span className="font-mono text-[10px] text-[var(--warning-icon)]">
              Answer this question to continue. This exam is taken in order.
            </span>
          )}
          <span className="font-mono text-[10px] text-[var(--border-primary)]">
            T-STAMP:{" "}
            {new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
        {/* Merged Next/Submit button, Submit only appears on the last question */}
        <button
          onClick={isLastQuestion ? () => setShowSubmitConfirm(true) : handleNext}
          disabled={isSubmitting || (!isLastQuestion && nextBlocked)}
          className={isLastQuestion ? submitButtonClass : footerButtonClass}
        >
          {isLastQuestion ? (
            "Submit"
          ) : (
            <>
              Next
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </>
          )}
        </button>
      </footer>

      <SubmitConfirmationModal
        isOpen={showSubmitConfirm}
        totalCount={fetchedQuestions.length}
        answeredCount={progressCurrent}
        flaggedCount={flaggedIds.size}
        isSubmitting={isSubmitting}
        onConfirm={handleOnSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  );
}

const footerButtonClass =
  "flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#adc6ff] bg-[#adc6ff] text-[#00285d] text-[13px] font-bold cursor-pointer hover:bg-[#c5d7ff] hover:border-[#c5d7ff] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
