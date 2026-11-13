import { Fragment, useState, useMemo, useEffect, useRef } from "react"; 
import { useRouterLogic } from "../../router/routerLogic";
import { useExamSessionStore } from "../../stores/useExamSessionStore";
import { useExamQuestions } from "../../hooks/useExamQuestions"; 
import { useExamTimer } from "../../hooks/useExamTimer"; 
import { useQuestionTimeTracker } from "../../hooks/useQuestionTimeTracker"; 
import { useSessionRules } from "../../hooks/useSessionRules"; 
import { SubmitConfirmationModal } from "../../components/modals/submitConfirmationModal"; 
import { useCodeExecution } from "../../hooks/useCodeExecution"; 
import { CodeEditor } from "../../components/examQuestion/codeEditor";
import { useSubmitExamSession } from "../../hooks/useSubmitExamSession";
import type { SubmittedAnswer } from "../../services/examService";
import { countAnsweredQuestions, hasQuestionAnswer } from "../../lib/examProgress";
import { AnswerChangeTracker } from "../../lib/answerChanges";
import { useViolationLogger } from "../../hooks/useViolationLogger"; 
import { useRemovalWatcher } from "../../hooks/useRemovalWatcher"; 
import { useLiveStateReporter } from "../../hooks/useLiveStateReporter"; 
import { checkIfRemoved, getSessionStatus } from "../../services/removalService";
import { useMovementEvents } from "../../hooks/useMovementEvents"; 

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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusStyle(
  status: "unanswered" | "answered" | "flagged",
  isCurrent: boolean,
): string {
  if (isCurrent) return "bg-[#adc6ff] text-[#00285d] border-[#adc6ff]";
  if (status === "answered")
    return "bg-[#1c2b3c] text-[#d4e4fa] border-[#424754]";
  if (status === "flagged")
    return "bg-transparent text-[#c2c6d6] border-[#424754]";
  return "bg-transparent text-[#8c909f] border-[#424754]";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuestionMapGrid({
  items,
  currentNumber,
  onNavigate,
}: {
  items: QuestionMapItem[];
  currentNumber: number;
  onNavigate?: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ number, status, sectionTitle, locked }, index) => (
        <Fragment key={number}>
          {/* a heading row whenever a new section starts (only exams with sections have these) */}
          {sectionTitle && sectionTitle !== items[index - 1]?.sectionTitle && (
            <p className="col-span-4 mt-2 first:mt-0 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--text-inverted-secondary)] break-words">
              {sectionTitle}
            </p>
          )}
          <button
            onClick={() => !locked && onNavigate?.(number)}
            disabled={locked}
            title={locked ? "Answer the earlier questions first" : undefined}
            className={`
              h-9 w-full rounded-lg border text-[12px] font-semibold font-mono
              transition-colors duration-150 relative
              ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              ${statusStyle(status, number === currentNumber)}
              ${status === "flagged" && number !== currentNumber ? "border-dashed" : ""}
            `}
          >
            {number}
            {status === "flagged" && number !== currentNumber && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--warning-icon)]" />
            )}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

// MCQ answer options
function MCQOptions({
  options,
  selectedId,
  onSelect,
  onClear,
}: {
  options: (MCQQuestion["options"][number] & { displayLetter?: string })[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-6 w-full min-w-0">
      {options.map(({ id, text, displayLetter }) => {
        const isSelected = selectedId === id;
        return (
          <button
            key={id}
            onClick={() => onSelect?.(id)}
            style={{ outline: "none", boxShadow: "none" }}
            className={`
              flex items-start gap-4 w-full max-w-full text-left px-5 py-4 rounded-lg border
              cursor-pointer transition-all duration-150 box-border overflow-hidden
              ${
                isSelected
                  ? "border-[#00285d] bg-[var(--bg-app)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-sidebar)]"
              }
            `}
          >
            {/* Option letter badge, shows A/B/C/D, not the raw database id */}
            <span
              className={`
                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                font-mono text-[13px] font-bold border transition-colors duration-150
                ${
                  isSelected
                    ? "bg-[var(--bg-sidebar)] text-[var(--text-inverted)] border-[var(--text-subtle)]"
                    : "bg-[var(--bg-app)] text-[var(--text-primary)] border-[var(--border-primary)]"
                }
              `}
            >
              {displayLetter ?? id}
            </span>
            <span
              className={`text-[14px] leading-relaxed min-w-0 flex-1 break-words whitespace-normal ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-inverted)]"}`}
            >
              {text}
            </span>
          </button>
        );
      })}

      {/* Clears the current selection, only shown if something is picked. Plain clickable text, not a button, so it never gets a native focus ring. */}
      {selectedId && (
        <span
          onClick={() => onClear?.()}
          className="self-end mt-1 text-[13px] font-semibold cursor-pointer text-[#00285d] hover:underline"
        >
          Clear Choice
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen, named export (not default)
// ---------------------------------------------------------------------------

export function ExamQuestionScreen({
  onNavigate,
  onFlag,
  onAnswerSelect,
  onCodeChange,
  onPrevious,
  onNext,
  onSubmit,
}: ExamQuestionScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const examTitle = useExamSessionStore((state) => state.examTitle) ?? ""; // real exam title
  const sessionId = useExamSessionStore((state) => state.sessionId); // real session id, needed for the timer
  const removed = useExamSessionStore((state) => state.removed); // stop reporting once the teacher removed this student
  const questionIdRef = useRef<string | null>(null);
  useViolationLogger(sessionId, questionIdRef); 
  useRemovalWatcher(sessionId);
  const {
    questions: fetchedQuestions,
    isLoading,
    error,
  } = useExamQuestions(sessionId); // this attempt's questions, in this student's own order
  const { submitSession, isSubmitting, error: submissionError, clearError: clearSubmissionError } = useSubmitExamSession();
  const submissionInFlightRef = useRef(false);
  const timedOutAnswersRef = useRef<SubmittedAnswer[] | null>(null);
  const answersLocked = () => submissionInFlightRef.current || timedOutAnswersRef.current !== null;


  // Retain exactly the answers present at the deadline if the network requires a retry.
  const handleTimeExpired = async () => {
    timedOutAnswersRef.current = buildAnswers();
    setShowSubmitConfirm(false);
    await submitAndLeave();
  };

  const { rules, isLoaded: rulesLoaded, error: rulesError, retry: retryRules } = useSessionRules(sessionId);
  // Hard stop by default: at zero the answers are submitted automatically. With overtime allowed the clock keeps running past zero.
  const timer = useExamTimer(sessionId, handleTimeExpired, {
    allowOvertime: rules.allowOvertime,
    rulesReady: rulesLoaded,
    onTimeRestored: () => {
      if (submissionInFlightRef.current) return false;
      timedOutAnswersRef.current = null;
      clearSubmissionError();
      return true;
    },
  }); // real countdown, ticks every second
  const timeLeftSeconds = timer.secondsLeft;

  // NEW — real Run Tests / Run Code state and actions
  const {
    isRunning,
    testsResult,
    codeResult,
    runError,
    handleRunTests: runTests,
    handleRunCode: runCode,
    clearResults,
  } = useCodeExecution();

  // Tracks which question is currently shown, by position in the loaded list.
  const [currentIndex, setCurrentIndex] = useState(0);
  // WBS 6.7: how long the student spends on each question (only while it is on screen and the window is in front)
  const { getTimes } = useQuestionTimeTracker(fetchedQuestions[currentIndex]?.id ?? null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // the "are you sure?" step before submitting
  // The output panel height is kept here so it survives moving between questions (undefined = use the editor's default)
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);
  // WBS 8.13 / 8.16: when each answer was last changed, how many times it was changed after first being given,
  // and the last answer the student settled on (used to tell a real change from the first answer)
  const answeredAtRef = useRef<Record<string, string>>({});
  const changeTrackerRef = useRef(new AnswerChangeTracker());
  useEffect(() => {
    const current = fetchedQuestions[currentIndex];
    questionIdRef.current = current && !current.poolDrawId ? current.id : null; // null while loading, and for pooled questions (their id is a draw, not a question)
  }, [fetchedQuestions, currentIndex]);
  // Tracks flagged state per question id, kept in memory only for now.
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  // Tracks each question's chosen MCQ option id, kept in memory only for now.
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  // Tracks each fill-in-the-blank question's typed answer, kept in memory only for now.
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  // Tracks each coding question's current code text, kept in memory only for now.
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>(
    {},
  );

  // Builds the question map (sidebar grid) from the real fetched list.
  // Same idea as the "answered" status in the map: something was selected, typed or written.
  const answers = { selectedOptions, textAnswers, codeByQuestion };
  const isAnswered = (id: string) => {
    const current = fetchedQuestions.find((q) => q.id === id);
    return current !== undefined && hasQuestionAnswer(current, answers);
  };

  const liveQuestion = fetchedQuestions[currentIndex]; 
  const reportingEnabled = !isLoading && !removed && fetchedQuestions.length > 0; 
  const reportedQuestionId = liveQuestion && !liveQuestion.poolDrawId ? liveQuestion.id : null; 
  const reportedPosition = fetchedQuestions.length > 0 ? currentIndex + 1 : null; 
  useLiveStateReporter({
    sessionId, 
    enabled: reportingEnabled,
    questionId: reportedQuestionId, 
    position: reportedPosition, 
    total: fetchedQuestions.length > 0 ? fetchedQuestions.length : null, 
    answeredCount: countAnsweredQuestions(fetchedQuestions, answers),
  });
  const { flushNow: flushMovementEvents } = useMovementEvents({
    sessionId,
    enabled: reportingEnabled, 
    questionId: reportedQuestionId, 
    position: reportedPosition, 
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
        status: flaggedIds.has(q.id)
          ? "flagged"
          : hasQuestionAnswer(q, { selectedOptions, textAnswers, codeByQuestion })
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
      title: raw.title,
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
    clearResults(); // NEW — don't show the previous question's Run Tests/Run Code output
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

  // NEW — runs only the visible test cases, pure feedback, no writes.
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
    );
  };

  // NEW — runs every test case, writes logs, and updates the real running score.
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
    if (n - 1 === currentIndex) return;
    if (rules.sequential && n - 1 > firstUnansweredIndex) return; // in-order exams: cannot jump past an unanswered question
    settleCurrentAnswer();
    setCurrentIndex(n - 1); // convert 1-based display number to array index
    onNavigate?.(n);
  };

  const handlePrevious = () => {
    settleCurrentAnswer();
    setCurrentIndex((i) => Math.max(i - 1, 0)); // never go below the first question
    onPrevious?.();
  };

  const handleNext = () => {
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

  function buildAnswers(): SubmittedAnswer[] {
    const times = getTimes(); // seconds per question id, including the stretch running right now
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
      await submitAndLeave();
    } finally {
      setShowSubmitConfirm(false);
    }
  };

  const submitAndLeave = async () => {
    if (!sessionId || submissionInFlightRef.current) return;
    submissionInFlightRef.current = true; 
    try {
      await flushMovementEvents(1500); 
      const result = await submitSession(
        sessionId,
        timedOutAnswersRef.current ? "timed_out" : "submitted",
        timedOutAnswersRef.current ?? buildAnswers(),
      );
      if (!result) {
        // Removal has its own screen. A failed status check must retain the exam too.
        try {
          const status = await getSessionStatus(sessionId);
          if (status === "submitted" || status === "timed_out") { onSubmit?.(); navigateTo("examResult"); return; }
          if (status === "removed") await checkIfRemoved(sessionId);
        } catch { /* the submission error stays visible */ }
        return;
      }
      onSubmit?.();
      navigateTo("examResult");
    } finally {
      submissionInFlightRef.current = false;
    }
  };

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
        {/* Left pane: question pane */}
        <section
          className={`flex flex-col overflow-y-auto bg-[var(--bg-app)] border-r border-[var(--border-primary)] min-w-0 ${isCoding ? "w-[420px] flex-shrink-0" : "flex-1"}`}
        >
          {/* Question header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
            <div className="min-w-0">
              {question.sectionTitle && (
                <p className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-secondary)] mb-1 break-words">
                  {question.sectionTitle}
                </p>
              )}
              <h2 className="text-[22px] font-semibold text-[var(--text-primary)] leading-tight">
                {question.title}
              </h2>
            </div>
            <button
              onClick={handleFlag}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer
                transition-colors duration-150 font-mono text-[10px] font-semibold tracking-[0.15em] uppercase bg-[var(--warning-primary)] hover:bg-[var(--warning-secondary)]
                ${
                  question.isFlagged
                    ? "border-[var(--warning-icon)] text-[var(--warning-icon)] bg-[color:var(--warning-accent)]"
                    : "border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={
                  question.isFlagged
                    ? "var(--warning-icon)"
                    : "var(--text-primary)"
                }
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
                />
              </svg>
            </button>
          </div>
          {/* Question body */}
          <div className="px-6 pb-4 min-w-0">
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-5">
              {question.body}
            </p>

            {/* Coding: code snippet example */}
            {isCoding && codingQ?.codeSnippet && (
              <div className="rounded-lg p-4 mb-5 font-mono text-[13px] leading-relaxed overflow-x-auto bg-[var(--bg-sidebar)] border border-[var(--border-primary)]">
                {codingQ.codeSnippet.split("\n").map((line, i) => {
                  const isComment = line.trim().startsWith("//");
                  const isNote = line.trim().startsWith("(");
                  return (
                    <div
                      key={i}
                      className={
                        isComment
                          ? "text-[#8c909f]"
                          : isNote
                            ? "text-[#8c909f] italic"
                            : "text-[#c2c6d6]"
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

            {/* Fill in the blank: one text box */}
            {fitbQ && (
              <div className="mt-6 w-full min-w-0">
                <label
                  htmlFor="fitb-answer"
                  className="block font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-secondary)] mb-2"
                >
                  Your answer
                </label>
                <input
                  id="fitb-answer"
                  type="text"
                  value={fitbQ.answerText ?? ""}
                  onChange={(e) => handleTextChange(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Type your answer"
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-sidebar)] text-[var(--text-inverted)] text-[15px] outline-none focus:border-[var(--text-secondary)]"
                />
              </div>
            )}

            {/* MCQ: options */}
            {mcqQ && (
              <MCQOptions
                options={mcqQ.options}
                selectedId={localSelectedOption}
                onSelect={handleOptionSelect}
                onClear={handleClearOption}
              />
            )}
          </div>
        </section>

        {/* Center pane: code editor (coding only) */}
        {isCoding && codingQ && (
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
        )}
        {/* Right sidebar: question map */}
        <aside className="w-[220px] flex-shrink-0 flex flex-col border-l border-[var(--border-primary)] bg-[var(--bg-sidebar)] overflow-y-auto">
          <div className="p-4 flex-grow">
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
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[var(--border-primary)] pt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[var(--bg-card)] border border-[var(--border-primary)]" />
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">
                Answered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-transparent border border-dashed border-[var(--border-primary)] relative">
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--warning-icon)]" />
              </span>
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">
                Flagged
              </span>
            </div>
          </div>
        </aside>
      </div>

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
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-inverted)] text-[13px] font-semibold cursor-pointer hover:text-[var(--text-inverted-secondary)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
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
          className={
            isLastQuestion
              ? "flex items-center gap-2 px-6 py-2.5 rounded-lg border-none text-[13px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02] [background:var(--button-gradient)] text-[var(--button-gradient-text)] shadow-[0_0_20px_rgba(173,198,255,0.25)]"
              : "flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-transparent text-[var(--text-inverted)] text-[13px] font-semibold cursor-pointer hover:text-[var(--text-inverted-secondary)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          }
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