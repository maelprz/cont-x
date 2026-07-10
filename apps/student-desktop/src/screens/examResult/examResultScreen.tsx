import { CheckCircle2, Clock, Award, LayoutDashboard } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import { useExamSessionStore } from "../../stores/useExamSessionStore"; // real examTitle/sessionId/examId from the exam just taken
import type { ExamResultScreenProps, ResultMetric } from "./examResultScreen.types"; // this screen's props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
import { useEffect, useState } from "react"; // needed to fetch and hold real data
import { getSessionTimerInfo, getExamCode } from "../../services/examService"; // real timer info + real exam_code

// ---------------------------------------------------------------------------
// Mock data — scoring isn't wired up yet, so these stay as placeholders
// until a real grading feature exists.
// ---------------------------------------------------------------------------
const MOCK_COURSE_CODE = "CS-402"; // fallback only, used if the real exam_code fetch fails
const MOCK_FINAL_SCORE = 94; // no grading logic yet, still a placeholder
const MOCK_VALIDATED_GRADE = "Excellent"; // no grading logic yet, still a placeholder

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
  examTitle,
  courseCode,
  completedDate,
  sessionId,
  passed = true,
  finalScore = MOCK_FINAL_SCORE,
  validatedGrade = MOCK_VALIDATED_GRADE,
  metrics, // no longer defaults to MOCK_METRICS directly, built below from real data
  onReturnToDashboard,
}: ExamResultScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const storeExamTitle = useExamSessionStore((state) => state.examTitle); // real exam title from the session just taken
  const storeSessionId = useExamSessionStore((state) => state.sessionId); // real session id from the session just taken
  const storeExamId = useExamSessionStore((state) => state.examId); // real exam id, needed to fetch the real exam_code

  // Holds the real "Time Taken" and "Allocation" values, once fetched.
  const [timeTakenSeconds, setTimeTakenSeconds] = useState<number | null>(null);
  const [allocationSeconds, setAllocationSeconds] = useState<number | null>(null);
  const [realExamCode, setRealExamCode] = useState<string | null>(null); // holds the real student-facing exam_code

  // Fetches the real join time + duration once, and computes how long
  // the student actually spent, capped at the allotted duration.
  useEffect(() => {
    const idToUse = sessionId ?? storeSessionId; // prop override wins, otherwise the real store value
    if (!idToUse) return; // nothing to fetch without a real session id

    let isMounted = true;

    async function loadTimeTaken() {
      try {
        const info = await getSessionTimerInfo(idToUse!); // same real data source as the countdown timer
        const totalSeconds = info.durationMinutes * 60; // full allotted time, in seconds
        const joinedAtMs = new Date(info.joinedAt).getTime(); // real start timestamp
        const elapsedSeconds = Math.max(Math.floor((Date.now() - joinedAtMs) / 1000), 0); // guards against clock drift
        const cappedElapsed = Math.min(elapsedSeconds, totalSeconds); // never show more than the full duration

        if (isMounted) {
          setTimeTakenSeconds(cappedElapsed);
          setAllocationSeconds(totalSeconds);
        }
      } catch {
        // if this fails, the metric card below just falls back to mock text
      }
    }

    loadTimeTaken();

    return () => {
      isMounted = false;
    };
  }, [sessionId, storeSessionId]);

  // Fetches the real exam_code once, replacing the placeholder course code.
  useEffect(() => {
    const idToUse = storeExamId; // real exam id from the session just taken
    if (!idToUse) return; // nothing to fetch without a real exam id

    let isMounted = true;

    async function loadExamCode() {
      try {
        const code = await getExamCode(idToUse!); // real student-facing code
        if (isMounted) setRealExamCode(code);
      } catch {
        // if this fails, the header just falls back to the mock/prop value
      }
    }

    loadExamCode();

    return () => {
      isMounted = false;
    };
  }, [storeExamId]);

  // Formats seconds as HH:MM:SS, matching the existing timer display style.
  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Builds the real "Time Taken" metric once data has loaded, otherwise
  // falls back to the mock card so the layout never looks broken mid-fetch.
  const displayMetrics: ResultMetric[] =
    metrics ??
    (timeTakenSeconds !== null && allocationSeconds !== null
      ? [
          {
            label: "Time Taken",
            value: formatDuration(timeTakenSeconds),
            subtext: `Allocation: ${formatDuration(allocationSeconds)} max`,
          },
          MOCK_METRICS[1], // "Total Score" stays mocked, scoring isn't wired up yet
        ]
      : MOCK_METRICS);

  // Prop overrides win, otherwise use the real store value, otherwise fall back to a placeholder.
  const displayExamTitle = examTitle ?? storeExamTitle ?? "Exam";
  // Prop overrides win, otherwise use the real session id, otherwise show a placeholder.
  const displaySessionId = sessionId ?? storeSessionId ?? "—";
  // Prop overrides win, otherwise use today's real date, since we don't store a submitted_at yet on this screen.
  const displayCompletedDate =
    completedDate ??
    new Date().toLocaleDateString("en-CA"); // e.g. "2026.07.10" style, using ISO-like format
  // Prop override wins, otherwise the real fetched exam_code, otherwise the mock fallback.
  const displayCourseCode = courseCode ?? realExamCode ?? MOCK_COURSE_CODE;

  // returns to dashboard — calls optional prop callback first, then switches screen
  function handleReturnToDashboard() {
    onReturnToDashboard?.();
    navigateTo("dashboard");
  }

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
            {displayCourseCode} &middot; Completed on {displayCompletedDate} &middot; Session ID: {displaySessionId}
          </p>
        </div>

        {/* pass/fail badge — colored using existing accent tokens. Still hardcoded, real grading isn't wired up yet. */}
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
          {displayMetrics.map((metric) => (
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