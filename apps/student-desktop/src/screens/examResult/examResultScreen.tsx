import { CheckCircle2, Clock, Award, LayoutDashboard } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import type { ExamResultScreenProps, ResultMetric } from "./examResultScreen.types"; // this screen's props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component

// ---------------------------------------------------------------------------
// Mock data — replace with real store/IPC values when wiring up
// ---------------------------------------------------------------------------
const MOCK_EXAM_TITLE = "Advanced Distributed Systems";
const MOCK_COURSE_CODE = "CS-402";
const MOCK_COMPLETED_DATE = "2025.10.24";
const MOCK_SESSION_ID = "AX-9921";
const MOCK_FINAL_SCORE = 94;
const MOCK_VALIDATED_GRADE = "Excellent";

const MOCK_METRICS: ResultMetric[] = [
  { label: "Time Taken", value: "01:42:15", subtext: "Allocation: 02:00:00 max" },
  { label: "Total Score", value: "38/40 Correct", subtext: "Total Questions: 40" },
];

// ---------------------------------------------------------------------------
// Sub-component — small metric card, same role as DetailCard in examConfirmation
// ---------------------------------------------------------------------------

function MetricCard({ label, value, subtext, icon }: ResultMetric & { icon: React.ReactNode }) {
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
      <p className="text-xs text-[var(--text-secondary)]">
        {subtext}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ExamResultScreen({
  examTitle = MOCK_EXAM_TITLE,
  courseCode = MOCK_COURSE_CODE,
  completedDate = MOCK_COMPLETED_DATE,
  sessionId = MOCK_SESSION_ID,
  passed = true,
  finalScore = MOCK_FINAL_SCORE,
  validatedGrade = MOCK_VALIDATED_GRADE,
  metrics = MOCK_METRICS,
  onReturnToDashboard,
}: ExamResultScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  // returns to dashboard — calls optional prop callback first, then switches screen
  function handleReturnToDashboard() {
    onReturnToDashboard?.();
    navigateTo("dashboard");
  }

  return (
    // flex flex-col: stacks header, summary heading, and cards vertically
    <div className="flex flex-col">
      <AppHeader />

      {/* "Exam Summary" hero with pass/fail badge */}
      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            {examTitle}
          </h1>
          <p className="font-[var(--font-label)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            {courseCode} &middot; Completed on {completedDate} &middot; Session ID: {sessionId}
          </p>
        </div>

        {/* pass/fail badge — colored using existing accent tokens */}
        <span
          className={`flex items-center gap-1.5 font-[var(--font-label)] text-[11px] uppercase tracking-wide rounded-full px-3 py-1.5 whitespace-nowrap ${
            passed
              ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
              : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
          }`}
        >
          <CheckCircle2 size={13} />
          {passed ? "Pass" : "Fail"}
        </span>
      </div>

      <main className="flex flex-col gap-8 px-8 pb-8 pt-6">

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
              {finalScore}
            </span>
            <span className="text-[var(--text-secondary)] text-lg ml-1">
              /100
            </span>
          </div>

          <p className="font-[var(--font-label)] text-xs uppercase tracking-wide text-[var(--accent-blue)]">
            Validated Grade: {validatedGrade}
          </p>
        </section>

        {/* ── Metric cards row ── */}
        <section className="flex gap-5 flex-wrap">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              {...metric}
              icon={
                metric.label === "Time Taken"
                  ? <Clock size={14} className="text-[var(--text-secondary)]" />
                  : <Award size={14} className="text-[var(--text-secondary)]" />
              }
            />
          ))}
        </section>

        {/* ── Return to dashboard ── */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleReturnToDashboard}
            className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-white/[0.04] whitespace-nowrap"
          >
            <LayoutDashboard size={15} />
            Return to Dashboard
          </button>
        </div>
      </main>

      <footer className="px-8 py-4 border-t border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs text-center">
        <span>Cont/x — Development Build</span>
      </footer>
    </div>
  );
}