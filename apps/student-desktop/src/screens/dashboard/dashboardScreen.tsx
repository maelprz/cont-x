import { useState } from "react"; // remembers values across re-renders
import type { ChangeEvent } from "react"; // type of the event fired when the input's text changes
import { ArrowRight, TrendingUp } from "lucide-react"; // pre-made icon components used on this screen
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active
import type { DashboardScreenProps } from "./dashboardScreen.types"; // this screen's (currently empty) props contract
import "./dashboardScreen.css"; // styling for everything rendered below

// Shape of one row in the Previous Exams table.
interface ExamHistoryEntry {
  id: string; // unique key, used by React's list rendering
  moduleName: string; // human-readable exam name
  moduleCode: string; // short code shown under the name
  date: string; // when the exam was taken
  resultPercent: number; // score, as a whole number percentage
  passed: boolean; // controls which badge color renders
}

// TEMPORARY mock data — stands in for a real call to Supabase/IPC, which doesn't exist yet.
// Swapping this for real data later means replacing this array, nothing else in this file.
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

// TEMPORARY mock name — Login is skipped, so there's no real logged-in student yet.
const mockStudentName = "Alex";

// Renders the screen a student sees right after logging in.
export function DashboardScreen(_props: DashboardScreenProps) {
  // Holds whatever text the student has typed into the exam code box. Local only — nothing else needs it yet.
  const [examCodeInput, setExamCodeInput] = useState("");

  // Pulls just the navigateTo action out of the router store, so this screen can switch screens.
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  // Runs every time the student types or deletes a character in the exam code box.
  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setExamCodeInput(event.target.value); // stores the new text only — no validation happens here
  }

  // Runs when the student clicks "Verify Exam Code".
  function handleVerifyExamCode() {
    navigateTo("examConfirmation"); // tells the router to switch to the Exam Confirmation screen
  }

  return (
    <div className="dashboard-screen">
      {" "}
      {/* outer wrapper for this screen's own content */}
      {/* Hero section: welcome message + placeholder status badge */}
      <header className="dashboard-hero">
        <div className="dashboard-hero-text">
          <h1>Welcome back, {mockStudentName}</h1>{" "}
          {/* name is mock until real login exists */}
          <p>
            Ready to continue your certification journey? Your dashboard keeps
            track of upcoming and completed exams.
          </p>
        </div>
        {/* TODO: swap for <LockdownStatusIndicator /> once that's built, in a later stage */}
        <span className="dashboard-status-badge">No Active Session</span>
      </header>
      <main className="dashboard-content">
        {" "}
        {/* everything below the hero */}
        {/* Card where the student enters their exam code */}
        <section className="initialize-session-card">
          <div className="initialize-session-text">
            {" "}
            {/* left side: heading + description */}
            <h2>Ready for your assessment?</h2>
            <p>
              Enter the exam code your instructor gave you to verify and
              continue.
            </p>
          </div>
          <div className="initialize-session-action">
            {" "}
            {/* right side: input + button */}
            <input
              type="text" // plain text field
              placeholder="Exam Code (e.g. CS101-42)" // gray hint text shown when empty
              value={examCodeInput} // box always shows exactly what's in state
              onChange={handleExamCodeChange} // fires on every keystroke
            />
            <button
              type="button" // stops this from ever behaving like a form-submit button
              onClick={handleVerifyExamCode} // fires once on click
            >
              Verify Exam Code <ArrowRight size={16} />{" "}
              {/* arrow icon for visual emphasis */}
            </button>
          </div>
        </section>
        {/* Previous exams table, using the mock data defined above */}
        <section className="exam-history-section">
          <div className="exam-history-header">
            <h2>Previous Exams</h2>
            {/* Decorative only — no exam-archive screen exists yet, so this isn't clickable */}
            <span className="exam-history-view-all">View Full Archive</span>
          </div>
          <table className="exam-history-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Date</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Renders one row per mock entry — same pattern works once real data replaces the mock */}
              {examHistoryMock.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="exam-history-module-name">
                      {entry.moduleName}
                    </span>
                    <span className="exam-history-module-code">
                      Module {entry.moduleCode}
                    </span>
                  </td>
                  <td>{entry.date}</td>
                  <td>
                    <span
                      className={`exam-history-result-badge ${
                        entry.passed
                          ? "exam-history-result-badge--pass"
                          : "exam-history-result-badge--fail"
                      }`}
                    >
                      {entry.resultPercent}% {entry.passed ? "Pass" : "Fail"}
                    </span>
                  </td>
                  <td>
                    <TrendingUp size={16} />{" "}
                    {/* decorative icon — not wired to any action yet */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <footer className="dashboard-footer">
        <span>Cont/x — Development Build</span>{" "}
        {/* honest placeholder, not claiming a real version/identity system yet */}
      </footer>
    </div>
  );
}
