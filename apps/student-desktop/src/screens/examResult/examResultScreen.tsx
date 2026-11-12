import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Lock,
  LayoutDashboard,
} from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import { useExamSessionStore } from "../../stores/useExamSessionStore"; // real sessionId, set either right after finishing or from clicking a history row
import type {
  ExamResultScreenProps,
  ResultMetric,
} from "./examResultScreen.types"; // this screen's props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
import { useExamResultDetails } from "../../hooks/useExamResultDetails"; // loads the score, duration and pass mark
import { AnswerReviewList } from "../../components/examResult/answerReviewList"; // NEW: the per-question answer review
import { useSessionReview } from "../../hooks/useSessionReview"; // NEW: fetches the review, only when allowed

// ---------------------------------------------------------------------------
// Sub-component — small metric card, same role as DetailCard in examConfirmation
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  subtext,
  icon,
}: ResultMetric & { icon: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl p-5 flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <p className="text-[var(--text-primary)] text-2xl font-semibold mb-1">
        {value}
      </p>
      <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line">
        {subtext}
      </p>
    </div>
  );
}

// Formats seconds as HH:MM:SS, matching the existing timer display style.
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ExamResultScreen({
  examTitle,
  courseCode,
  completedDate,
  sessionId,
  passed,
  finalScore,
  maxScore,
  metrics,
  onReturnToDashboard,
}: ExamResultScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const storeSessionId = useExamSessionStore((state) => state.sessionId); // set either right after finishing, or by clicking a history row
  const idToUse = sessionId ?? storeSessionId; // prop override wins, otherwise the real store value

  // Fetches every real value this screen needs, in one call, keyed by
  // whichever session id is active — works the same whether the student
  // just finished the exam or clicked an old row in Archive
  const { details, isLoading, error } = useExamResultDetails(idToUse);

  // NEW: loads the answer review, but only once we know the teacher allows it.
  // Must stay above the early returns below, because hooks have to run on every render.
  const {
    review, // loaded review, or null
    isLoading: reviewLoading, // review fetch state, renamed so it doesn't clash with the one above
    error: reviewError, // review error, renamed for the same reason
    retry: retryReview,
  } = useSessionReview(idToUse, details?.allowReview === true); // stays disabled until details say review is allowed

  // returns to dashboard — calls optional prop callback first, then switches screen
  function handleReturnToDashboard() {
    onReturnToDashboard?.();
    navigateTo("dashboard");
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--bg-app)] text-[var(--text-primary)]">
        Loading exam result...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--bg-app)] text-[var(--text-primary)]">
        {error ?? "No exam result found."}
      </div>
    );
  }

  // Prop overrides win, otherwise the real fetched value.
  const displayExamTitle = examTitle ?? details.examTitle;
  const displayCourseCode = courseCode ?? details.examCode;
  const displaySessionId = idToUse ?? "—";
  // Real submitted_at as a readable date and time, e.g. "Friday 6 November 2026, 2:50 PM".
  const completedAt = details.submittedAt
    ? new Date(details.submittedAt)
    : new Date(); // falls back to now only if submitted_at is somehow missing
  const displayCompletedDate =
    completedDate ??
    `${completedAt.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${completedAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

  // Real elapsed time: submitted_at minus joined_at, capped at the allotted duration.
  const allocationSeconds = details.durationMinutes * 60;
  const rawElapsed = details.submittedAt
    ? Math.floor(
        (new Date(details.submittedAt).getTime() -
          new Date(details.joinedAt).getTime()) /
          1000,
      )
    : 0;
  const timeTakenSeconds = Math.max(Math.min(rawElapsed, allocationSeconds), 0);

  // Answer review follows the teacher's "Allow review" setting for this class exam (off by default).
  const reviewPermitted = details.allowReview;

  const displayMetrics: ResultMetric[] = metrics ?? [
    {
      label: "Time Taken",
      value: formatDuration(timeTakenSeconds),
      subtext: `Completed on ${displayCompletedDate}\nAllocation: ${formatDuration(allocationSeconds)} max`, // completed on sits right under the time
    },
    {
      label: "Total Score",
      value: `${details.correctCount}/${details.totalQuestions} Correct`,
      subtext: `Total Points: ${details.maxScore}`,
    },
    {
      label: "Review",
      value: reviewPermitted ? "Permitted" : "Not permitted",
      subtext: reviewPermitted
        ? "You can review your answers."
        : "Your teacher has not allowed answer review for this exam.",
    },
  ];

  const displayFinalScore = finalScore ?? details.totalScore;
  const displayMaxScore = maxScore ?? details.maxScore;
  const displayPercent =
    displayMaxScore > 0
      ? Math.round((displayFinalScore / displayMaxScore) * 100)
      : 0; // score as a percent, 0 if the exam has no points

  // Real pass/fail: percentage of points earned vs. the exam's pass_mark.
  const displayPassed =
    passed ??
    (details.maxScore > 0 &&
      (details.totalScore / details.maxScore) * 100 >= details.passMark);
  return (
    // flex flex-col: stacks header, summary heading, and cards vertically
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-app)] text-[var(--text-primary)]">
      <AppHeader />

      {/* "Exam Summary" hero with pass/fail badge */}
      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            {displayExamTitle}
          </h1>
          <p className="font-[var(--font-label)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            {displayCourseCode} &middot; Session ID: {displaySessionId}
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 font-[var(--font-label)] text-[11px] uppercase tracking-wide rounded-full px-3 py-1.5 whitespace-nowrap ${
            displayPassed
              ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
              : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
          }`}
        >
          {displayPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          {displayPassed ? "Pass" : "Fail"}
        </span>
      </div>

      <main className="flex flex-col gap-8 px-8 pb-12 pt-8">
        {/* ── Score card ── */}
        <section className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-app)] border border-[var(--accent-blue)]/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-2xl p-7 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[var(--text-secondary)]" />
            <span className="font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
              Final Assessment Score
            </span>
          </div>

          <div>
            <span className="text-[var(--text-primary)] text-5xl font-bold">
              {displayFinalScore}
            </span>
            <span className="text-[var(--text-secondary)] text-lg ml-1">
              /{displayMaxScore}
            </span>
          </div>

          {/* Score bar, the thin tick marks the pass mark */}
          <div className="flex flex-col gap-2">
            <div className="relative h-2 w-full rounded-full bg-[var(--border-subtle)]">
              <div
                className={`h-full rounded-full ${displayPassed ? "bg-[var(--accent-green)]" : "bg-[#ef4444]"}`}
                style={{ width: `${Math.min(displayPercent, 100)}%` }}
              />
              {details.passMark > 0 && (
                <span
                  className="absolute top-[-3px] h-[14px] w-[2px] bg-[var(--text-primary)]"
                  style={{ left: `${Math.min(details.passMark, 100)}%` }}
                />
              )}
            </div>
            <p className="font-[var(--font-label)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              {displayPercent}% &middot;{" "}
              {details.passMark > 0
                ? `Pass mark ${details.passMark}%`
                : "No minimum pass mark"}
            </p>
          </div>
        </section>

        {/* ── Metric cards row ── */}
        <section className="flex gap-5 flex-wrap">
          {displayMetrics.map((metric) => (
            <MetricCard
              key={metric.label}
              {...metric}
              icon={
                metric.label === "Time Taken" ? (
                  <Clock size={14} className="text-[var(--text-secondary)]" />
                ) : metric.label === "Review" ? (
                  <Lock size={14} className="text-[var(--text-secondary)]" />
                ) : (
                  <Award size={14} className="text-[var(--text-secondary)]" />
                )
              }
            />
          ))}
        </section>

        {/* ── NEW: Answer review, only rendered when the teacher allows it ── */}
        {reviewPermitted && (
          <AnswerReviewList
            items={review?.items ?? []} // empty until the review loads
            keysRevealed={review?.keysRevealed ?? false} // current server permission controls answer keys
            isLoading={reviewLoading} // shows the loading line while fetching
            error={reviewError} // shows the server's reason if it refused
            onRetry={retryReview}
          />
        )}

        {/* ── Return to dashboard ── */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleReturnToDashboard}
            className="flex items-center gap-1.5 bg-[var(--bg-sidebar)] border border-[var(--border-primary)] text-[var(--text-inverted)] rounded-lg px-5 py-2.5 text-sm font-medium hover:scale-[1.05] transition-colors duration-200"
          >
            <LayoutDashboard size={15} />
            Return to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
