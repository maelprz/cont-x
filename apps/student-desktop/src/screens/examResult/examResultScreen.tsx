import { CheckCircle2, Clock, Award, LayoutDashboard } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import { useExamSessionStore } from "../../stores/useExamSessionStore"; // real sessionId, set either right after finishing or from clicking a history row
import type {
  ExamResultScreenProps,
  ResultMetric,
} from "./examResultScreen.types"; // this screen's props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
import { useExamResultDetails } from "../../hooks/useExamResultDetails";

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
      <p className="text-xs text-[var(--text-secondary)]">{subtext}</p>
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

  const { details, isLoading, error } = useExamResultDetails(idToUse);

  // Fetches every real value this screen needs, in one call, keyed by
  // whichever session id is active — works the same whether the student
  // just finished the exam or clicked an old row in Archive

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
  // Real submitted_at, formatted; falls back to today's date only if somehow missing.
  const displayCompletedDate =
    completedDate ??
    (details.submittedAt
      ? new Date(details.submittedAt).toLocaleDateString("en-CA")
      : new Date().toLocaleDateString("en-CA"));

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

  const displayMetrics: ResultMetric[] = metrics ?? [
    {
      label: "Time Taken",
      value: formatDuration(timeTakenSeconds),
      subtext: `Allocation: ${formatDuration(allocationSeconds)} max`,
    },
    {
      label: "Total Score",
      value: `${details.correctCount}/${details.totalQuestions} Correct`,
      subtext: `Total Points: ${details.maxScore}`,
    },
  ];

  const displayFinalScore = finalScore ?? details.totalScore;
  const displayMaxScore = maxScore ?? details.maxScore;

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
            {displayCourseCode} &middot; Completed on {displayCompletedDate}{" "}
            &middot; Session ID: {displaySessionId}
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 font-[var(--font-label)] text-[11px] uppercase tracking-wide rounded-full px-3 py-1.5 whitespace-nowrap ${
            displayPassed
              ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
              : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
          }`}
        >
          <CheckCircle2 size={13} />
          {displayPassed ? "Pass" : "Fail"}
        </span>
      </div>

      <main className="flex flex-col gap-8 px-8 pb-20 pt-20">
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
                ) : (
                  <Award size={14} className="text-[var(--text-secondary)]" />
                )
              }
            />
          ))}
        </section>

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

      <footer className="mt-auto px-12 py-4 bg-[var(--bg-footer)] border-t border-[var(--border-primary)] text-[var(--text-fine-print)] text-xs items-center text-center">
        <span>Cont/x — Development Build</span>
      </footer>
    </div>
  );
}
