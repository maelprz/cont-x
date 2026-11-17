import { useState } from "react"; // remembers values across re-renders
import type { ChangeEvent } from "react"; // type of the event fired when the input's text changes
import { ArrowRight } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import type { DashboardScreenProps } from "./dashboardScreen.types"; // this screen's (currently empty) props contract
import { ViewAnswersButton } from "../../components/examHistory/viewAnswersButton";
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
import { useAuthStore } from "../../stores/useAuthStore"; // store controlling the user's auth state
import { useExamSessionStore } from "../../stores/useExamSessionStore"; // carries exam to Confirmation, and which session to view on Result
import { useExamHistory } from "../../hooks/useExamHistory"; // custom hook for fetching exam history
import { useVerifyExamCode } from "../../hooks/useVerifyExamCode"; // new hook for exam code lookup

export function DashboardScreen(_props: DashboardScreenProps) {
  const [examCodeInput, setExamCodeInput] = useState("");
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const user = useAuthStore((state) => state.user);

  const { examHistory, isLoading: historyLoading, error: historyError } = useExamHistory(); // fetch exam history using the custom hook
  const {
    verifyExamCode,
    isVerifying,
    error: verifyError,
  } = useVerifyExamCode();

  const setExam = useExamSessionStore((state) => state.setExam); // saves exam into the shared store
  const setSessionId = useExamSessionStore((state) => state.setSessionId); // saves which session to view on the Result screen

  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setExamCodeInput(event.target.value);
  }

  async function handleVerifyExamCode() {
    const exam = await verifyExamCode(examCodeInput); // check the typed code against Supabase

    if (exam) {
      setExam(exam); // hand the found exam off to the Confirmation screen via the store
      navigateTo("examConfirmation"); // only redirect if an exam was actually found
    }
  }

  // Sends the student to the Result screen for this specific past exam session.
  function handleViewResult(sessionId: string) {
    setSessionId(sessionId); // tell the Result screen which session to load
    navigateTo("examResult");
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-app)] text-[var(--text-primary)]">
      <AppHeader title="Dashboard" />
      {/* "Welcome back" hero — converted to Tailwind */}
      <div className="flex items-start justify-between gap-4 px-4 sm:px-8 pt-8">
        <div>
          <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-xl font-semibold mb-2">
            Welcome back, {user?.firstName ?? "Student"}!
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-[420px]">
            Enter an exam code to get started, or revisit your recent results.
          </p>
        </div>
      </div>

      <main className="flex flex-col gap-7 px-4 sm:px-8 pb-12 pt-6">
        {/* Card where the student enters their exam code */}
        <section className="border border-stone-200 bg-[#f8f8f8] rounded-xl p-5 sm:p-6 flex items-center justify-between gap-5 flex-wrap">
          <div>
            <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-lg mb-2">
              Join an exam
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-[420px]">
              Enter the exam code your instructor gave you to verify and
              continue.
            </p>
          </div>
          <form className="flex w-full flex-wrap items-end gap-2 xl:w-auto" onSubmit={(event) => { event.preventDefault(); if (!isVerifying) void handleVerifyExamCode(); }}>
            <div className="min-w-0 flex-1 xl:w-56"><label htmlFor="exam-code" className="mb-1.5 block text-xs font-medium text-stone-600">Exam code</label>
            <input
              id="exam-code"
              aria-invalid={Boolean(verifyError)}
              aria-describedby={verifyError ? "exam-code-error" : undefined}
              type="text"
              placeholder="Exam Code (e.g. CS101-42)"
              value={examCodeInput}
              onChange={handleExamCodeChange}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-2 focus:outline-offset-2 focus:outline-[#465a3b]"
            />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#465a3b] bg-[#465a3b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#394a30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#465a3b] disabled:cursor-wait disabled:opacity-60"
            >
              {isVerifying ? "Verifying..." : "Verify code"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          {verifyError && (
            <p id="exam-code-error" role="alert" className="text-xs text-red-700 mt-2 basis-full">
              {verifyError}
            </p>
          )}
        </section>

        {/* Previous exams */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-lg">
              Previous Exams
            </h2>
            <button
              type="button"
              onClick={() => navigateTo("archive")} // navigateTo is already destructured at the top of this file
              className="text-[var(--accent-blue)] text-xs bg-transparent cursor-pointer"
            >
              View archive
            </button>
          </div>
          {/* Card wrapper — gives the table its background/border/shadow instead of floating bare */}
          <div className="bg-[var(--bg-card)] border border-stone-200 rounded-xl overflow-x-auto">
            <table className="min-w-[640px] w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr className="bg-stone-100/70">
                  <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                    Exam
                  </th>
                  <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                    Date
                  </th>
                  <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                    Result
                  </th>
                  <th className="text-center font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyLoading && <tr><td colSpan={4} role="status" className="px-5 py-8 text-center text-sm text-stone-500">Loading recent exams...</td></tr>}
                {!historyLoading && historyError && <tr><td colSpan={4} role="alert" className="px-5 py-8 text-center text-sm text-red-700">{historyError}</td></tr>}
                {!historyLoading && !historyError && examHistory.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-stone-500">Your completed exams will appear here.</td></tr>}
                {!historyLoading && !historyError && examHistory.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-stone-50"
                  >
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-stone-200"
                          : ""
                      }`}
                    >
                      <span className="block wrap-break-word font-medium">
                        {entry.examTitle}
                      </span>
                      <span className="block wrap-break-word text-xs text-[var(--text-secondary)] mt-0.5">
                        {entry.examCode}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-stone-200"
                          : ""
                      }`}
                    >
                      {entry.submittedAt}
                    </td>
                    <td
                      className={`py-4 px-5 text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-stone-200"
                          : ""
                      }`}
                    >
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          entry.passed
                            ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                            : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                        }`}
                      >
                        {entry.totalScore}% {entry.passed ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 ${
                        index < examHistory.length - 1
                          ? "border-b border-stone-200"
                          : ""
                      }`}
                    >
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResult(entry.id);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-primary)] text-xs font-normal cursor-pointer hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors duration-150"
                        >
                          View Results
                        </button>
                        {entry.allowReview && <ViewAnswersButton sessionId={entry.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
