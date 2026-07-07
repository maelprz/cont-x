import { useState } from "react"; // remembers values across re-renders
import type { ChangeEvent } from "react"; // type of the event fired when the input's text changes
import { ArrowRight, TrendingUp } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import type { DashboardScreenProps } from "./dashboardScreen.types"; // this screen's (currently empty) props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
import { useAuthStore } from "../../stores/useAuthStore"; // store controlling the user's auth state
import { useExamHistory } from "../../hooks/useExamHistory"; // custom hook for fetching exam history
import { useVerifyExamCode } from "../../hooks/useVerifyExamCode"; // new hook for exam code lookup

export function DashboardScreen(_props: DashboardScreenProps) {
  const [examCodeInput, setExamCodeInput] = useState("");
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const user = useAuthStore((state) => state.user);

  const { examHistory, isLoading, error } = useExamHistory(); // fetch exam history using the custom hook
  const {
    verifyExamCode,
    isVerifying,
    error: verifyError,
  } = useVerifyExamCode();

  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setExamCodeInput(event.target.value);
  }

  async function handleVerifyExamCode() {
    const exam = await verifyExamCode(examCodeInput); // check the typed code against Supabase

    if (exam) {
      navigateTo("examConfirmation"); // only redirect if an exam was actually found
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-app)] text-[var(--text-primary)]">
      <AppHeader />
      {/* "Welcome back" hero — converted to Tailwind */}
      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            Welcome back, {user?.firstName ?? "Student"}!
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-[420px]">
            Ready to continue your certification journey? Your dashboard keeps
            track of upcoming and completed exams.
          </p>
        </div>
      </div>

      <main className="flex flex-col gap-10 px-8 pb-12 pt-6">
        {/* Card where the student enters their exam code */}
        <section className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-app)] border border-[var(--accent-blue)]/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-2xl p-7 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-lg mb-2">
              Ready for your assessment?
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-[420px]">
              Enter the exam code your instructor gave you to verify and
              continue.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <input
              type="text"
              placeholder="Exam Code (e.g. CS101-42)"
              value={examCodeInput}
              onChange={handleExamCodeChange}
              className="bg-[var(--bg-app)] border border-[var(--border-primary)] rounded-lg px-2.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleVerifyExamCode}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-lg border-none text-[14px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)] font-[var(--font-body)] shadow-[var(--shadow)]"
            >
              Verify Exam Code <ArrowRight size={16} />
            </button>
          </div>
          {verifyError && (
            <p className="text-xs text-[#ef4444] mt-2 basis-full">
              {verifyError}
            </p>
          )}
        </section>

        {/* Previous exams table, using the mock data defined above */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-lg">
              Previous Exams
            </h2>
            <button
              type="button"
              onClick={() => navigateTo("archive")} // navigateTo is already destructured at the top of this file
              className="text-[var(--accent-blue)] text-xs bg-transparent cursor-pointer"
            >
              View Full Archive
            </button>
          </div>
          {/* Card wrapper — gives the table its background/border/shadow instead of floating bare */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                    Module
                  </th>
                  <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                    Date
                  </th>
                  <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                    Result
                  </th>
                  <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {examHistory.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      <span className="block font-medium">
                        {entry.examTitle}
                      </span>
                      <span className="block font-[var(--font-label)] text-xs text-[var(--text-secondary)] mt-0.5">
                        Module {entry.examCode}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      {entry.submittedAt}
                    </td>
                    <td
                      className={`py-4 px-5 text-sm ${
                        index < examHistory.length - 1
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      <span
                        className={`font-[var(--font-label)] text-xs px-2.5 py-1 rounded-full ${
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
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      <TrendingUp
                        size={16}
                        className="text-[var(--text-primary)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="mt-auto px-12 py-4 bg-[var(--bg-footer)] border-t border-[var(--border-primary)] text-[var(--text-fine-print)] text-xs items-center text-center">
        <span>Cont/x — Development Build</span>
      </footer>
    </div>
  );
}
