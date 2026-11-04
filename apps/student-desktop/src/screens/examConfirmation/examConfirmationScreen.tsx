import { useState, useEffect } from "react";
import type {
  ExamConfirmationScreenProps,
  ExamDetail,
} from "./examConfirmationScreen.types";
import { useExamConfirmationDetails } from "../../hooks/useExamConfirmationDetails";
import { useExamSessionStore } from "../../stores/useExamSessionStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useRouterLogic } from "../../router/routerLogic";
import { AppHeader } from "../../components/layout/appHeader";
import { SessionVerificationModal } from "../../components/modals/sessionVerificationModal";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailCard({ label, value, subtext }: ExamDetail) {
  return (
    <div className="bg-[var(--side-bar)] border border-[var(--border-primary)] rounded-lg p-4">
      <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--text-inverted-secondary)] mb-2">
        {label}
      </p>
      <p className="text-[var(--text-inverted)] text-[20px] font-semibold leading-tight">
        {value}
      </p>
      <p className="text-[var(--text-inverted-secondary)] text-xs mt-1">
        {subtext}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamConfirmationScreen({
  examTitle,
  studentName,
  studentId,
  examDetails,
  onStartExam,
  onCancel,
}: ExamConfirmationScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  const user = useAuthStore((state) => state.user); // real student name + id number
  const storeExamId = useExamSessionStore((state) => state.examId); // real exam id from Dashboard
  const storeClassExamId = useExamSessionStore((state) => state.classExamId);
  const storeExamTitle = useExamSessionStore((state) => state.examTitle); // real exam title from Dashboard
  const setSessionId = useExamSessionStore((state) => state.setSessionId); // saves session id after verifying
  const storeAttemptsRemaining = useExamSessionStore(
    (state) => state.attemptsRemaining,
  ); // real attempts left
  const { details } = useExamConfirmationDetails(storeExamId);

  // Builds the real detail cards from fetched data, falling back to placeholder text.
  const displayExamDetails: ExamDetail[] = examDetails ?? [
    {
      label: "Duration",
      value: details ? `${details.durationMinutes} Minutes` : "—",
      subtext: "Non-stop session",
    },
    {
      label: "Total Questions",
      value: details ? `${details.totalQuestions} Questions` : "—",
      subtext: "Live evaluation",
    },
    {
      label: "Pass Mark",
      value: details ? `${details.passMark}% Threshold` : "—",
      subtext: "Academy standard",
    },
    {
      label: "Attempts Left",
      value:
        storeAttemptsRemaining != null
          ? `${storeAttemptsRemaining} Remaining`
          : "—",
      subtext:
        storeAttemptsRemaining === 1 ? "Final attempt" : "Attempts remaining",
    },
  ];

  // If this screen is reached with no exam loaded (e.g. back button, refresh),
  // send the student back to Dashboard instead of showing broken mock data.
  useEffect(() => {
    if (!storeExamId) {
      navigateTo("dashboard");
    }
  }, [storeExamId, navigateTo]);

  // Prop overrides win, otherwise use the real store value, otherwise fall back to mock.
  const displayTitle = examTitle ?? storeExamTitle;
  // Prop overrides win, otherwise use the real logged-in student, otherwise fall back to mock.
  const displayStudentName =
    studentName ?? (user ? `${user.firstName} ${user.lastName}` : "");
  const displayStudentId = studentId ?? user?.idNumber;

  const handleCancel = () => {
    onCancel?.();
    navigateTo("dashboard");
  };

  const handleStart = () => {
    setIsVerificationOpen(true); // opens the modal, unchanged
  };

  // Called by the modal only after the server confirms the code is correct.
  const handleVerificationConfirm = (sessionId: string) => {
    setSessionId(sessionId); // save the real session id for the next screen
    onStartExam?.();
    setIsVerificationOpen(false);
    navigateTo("examQuestion");
  };

  const handleVerificationCancel = () => {
    setIsVerificationOpen(false);
  };

  return (
    <div className="h-screen w-full flex flex-col text-[var(--text-primary)] overflow-hidden">
      <AppHeader
        studentName={displayStudentName}
        studentId={displayStudentId}
      />
      <SessionVerificationModal
        isOpen={isVerificationOpen}
        examId={storeClassExamId ?? ""}
        onConfirm={handleVerificationConfirm}
        onCancel={handleVerificationCancel}
      />

      {/* ── Main canvas ───────────────────────────────────────────── */}
      <main className="flex-grow flex items-center justify-center px-6 py-4 relative overflow-hidden bg-[var(--bg-app)]">
        {/* Atmospheric glow */}
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-[860px]">
          {/* ── Card ──────────────────────────────────────────────── */}
          <div className="bg-[var(--bg-sidebar)] rounded-xl p-10 overflow-hidden ">
            {/* ── Card header ───────────────────────────────────── */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold text-[var(--text-inverted)] leading-tight mb-1">
                {displayTitle}
              </h1>
              <p className="text-[var(--text-inverted-secondary)] text-[14px] leading-relaxed max-w-[580px]">
                Please confirm the details below. Once you start, the system
                will enter a restricted state to ensure academic integrity. Make
                sure your environment is quiet and free of unauthorized
                materials.
              </p>
            </div>

            {/* ── Detail grid ───────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {displayExamDetails.map((detail) => (
                <DetailCard key={detail.label} {...detail} />
              ))}
            </div>

            {/* ── Lockdown warning ──────────────────────────────── */}
            <div className="flex gap-4 items-start p-4 mb-5 rounded-lg bg-[var(--warning-primary)] border border-[var(--warning-secondary)]">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--warning-accent)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="var(--warning-icon)"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-[var(--warning-icon)] text-[15px] font-semibold mb-1">
                  Lockdown Protocol Active
                </h3>
                <p className="text-[13px] leading-relaxed text-[var(--warning-text)]">
                  Clicking the button below will terminate all unauthorized
                  applications and lock your screen to this window. Any attempt
                  to exit, switch tabs, or use screen-sharing software will be
                  logged as a violation and may result in immediate
                  disqualification.
                </p>
              </div>
            </div>

            {/* ── Action row ────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[var(--border-primary)]">
              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-inverted)] text-[14px] font-semibold cursor-pointer transition-colors duration-200 hover:text-[var(--text-inverted-secondary)] font-[var(--font-body)]"
              >
                Cancel &amp; Return to Dashboard
              </button>

              {/* Primary CTA */}
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-lg border border-[var(--border-subtle)] text-[14px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)] font-[var(--font-body)] shadow-[var(--shadow)]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                Enter Exam
              </button>
            </div>

            {/* Fine print */}
            <p className="text-center mt-4 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--text-fine-print)]">
              By starting, you agree to the Academic Integrity Policy of
              CodeLit.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="h-11 flex-shrink-0 flex items-center px-12 border-t border-[var(--border-primary)] backdrop-blur-sm bg-[var(--bg-footer)]">
        <div className="flex justify-between items-center w-full max-w-[1280px] mx-auto">
          <div className="flex items-center gap-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#bec6e0"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[var(--text-fine-print)]">
              SYNC: 12ms LATENCY
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-fine-print)]">
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>
    </div>
  );
}
