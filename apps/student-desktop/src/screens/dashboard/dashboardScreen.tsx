import { useState } from "react"; // remembers values across re-renders
import type { ChangeEvent } from "react"; // type of the event fired when the input's text changes
import { ArrowRight, TrendingUp } from "lucide-react"; // pre-made icon components
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import type { DashboardScreenProps } from "./dashboardScreen.types"; // this screen's (currently empty) props contract
import { AppHeader } from "../../components/layout/appHeader"; // shared header bar component
// no CSS import — the body below is Tailwind now; the header block keeps its own inline styles

// Duplicated from ExamConfirmationScreen's own color object — kept as raw inline styles
// to stay byte-for-byte consistent with that copy, since we chose NOT to share one header component.

// TEMPORARY mock identity — Login is skipped, so there's no real logged-in student yet.
const mockStudentName = "Alex";
const mockStudentId = "2021-00001";

// Shape of one row in the Previous Exams table.
interface ExamHistoryEntry {
  id: string;
  moduleName: string;
  moduleCode: string;
  date: string;
  resultPercent: number;
  passed: boolean;
}

// TEMPORARY mock data — stands in for a real call to Supabase/IPC, which doesn't exist yet.
const examHistoryMock: ExamHistoryEntry[] = [
  {
    id: "1",
    moduleName: "Data Structures & Algorithms",
    moduleCode: "DSA-402",
    date: "Oct 24, 2025",
    resultPercent: 98,
    passed: true,
  },
  {
    id: "2",
    moduleName: "Full Stack Integration",
    moduleCode: "FS-109",
    date: "Sep 12, 2025",
    resultPercent: 92,
    passed: true,
  },
  {
    id: "3",
    moduleName: "Database Schema Design",
    moduleCode: "DB-221",
    date: "Aug 28, 2025",
    resultPercent: 89,
    passed: true,
  },
];

export function DashboardScreen(_props: DashboardScreenProps) {
  const [examCodeInput, setExamCodeInput] = useState("");
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setExamCodeInput(event.target.value);
  }

  function handleVerifyExamCode() {
    navigateTo("examConfirmation");
  }

  const initials = mockStudentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    // flex flex-col: stacks header, hero, and content vertically
    <div className="flex flex-col">
      {/* Duplicated header bar — unchanged, kept as raw inline styles on purpose */}
      <AppHeader />
      {/* "Welcome back" hero — converted to Tailwind */}
      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            Welcome back, {mockStudentName}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-[420px]">
            Ready to continue your certification journey? Your dashboard keeps
            track of upcoming and completed exams.
          </p>
        </div>
        {/* TODO: swap for <LockdownStatusIndicator /> once that's built, in a later stage */}
        <span className="font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-full px-3 py-1 whitespace-nowrap">
          No Active Session
        </span>
      </div>

      <main className="flex flex-col gap-10 px-8 pb-8 pt-6">
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
              className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleVerifyExamCode}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-lg border-none text-[14px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #4d8eff 0%, #adc6ff 100%)",
                color: "#00285d",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 0 24px rgba(173,198,255,0.3)",
              }}
            >
              Verify Exam Code <ArrowRight size={16} />
            </button>
          </div>
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
                {examHistoryMock.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistoryMock.length - 1
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      <span className="block font-medium">
                        {entry.moduleName}
                      </span>
                      <span className="block font-[var(--font-label)] text-xs text-[var(--text-secondary)] mt-0.5">
                        Module {entry.moduleCode}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 text-[var(--text-primary)] text-sm ${
                        index < examHistoryMock.length - 1
                          ? "border-b border-[var(--border-subtle)]"
                          : ""
                      }`}
                    >
                      {entry.date}
                    </td>
                    <td
                      className={`py-4 px-5 text-sm ${
                        index < examHistoryMock.length - 1
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
                        {entry.resultPercent}% {entry.passed ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 ${
                        index < examHistoryMock.length - 1
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

      <footer className="px-8 py-4 border-t border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs text-center">
        <span>Cont/x — Development Build</span>
      </footer>
    </div>
  );
}
