import { useState } from "react";
import { Search, Download, FileText, Check, X } from "lucide-react"; // Clock removed, no partial status
import type {
  ExamResultsScreenProps,
  StudentResultRow,
} from "./examResultsScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useExamResults } from "../../hooks/useExamResults";
import { useExamResultsStore } from "../../store/useExamResultsStore";

// picks an icon and color for a question cell based on its status
function StatusIcon({
  status,
}: {
  status: StudentResultRow["questionScores"][number]["status"];
}) {
  if (status === "correct") {
    return <Check size={13} style={{ color: "var(--color-success)" }} />;
  }
  return <X size={13} style={{ color: "var(--color-error)" }} />;
}

export function ExamResultsScreen({ rows: rowsProp }: ExamResultsScreenProps) {
  const [search, setSearch] = useState(""); // search box text, local only

  // reads which exam's results to show, set when a card was clicked on the list screen
  const currentExamId = useExamResultsStore((state) => state.currentExamId);
  const { data, isLoading, error } = useExamResults(currentExamId);

  // uses real fetched rows unless a prop override was passed in (e.g. for testing)
  const rows = rowsProp ?? data?.rows ?? [];

  const examTitle = data?.examTitle ?? "";
  const examCode = data?.examCode ?? "";
  const durationMinutes = data?.durationMinutes ?? 0;
  const passMark = data?.passMark ?? 0;

  // filters rows by student name, case-insensitive
  const filtered = rows.filter((row) =>
    row.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  // derived stats from real rows
  const classAverage =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.totalScore, 0) / rows.length)
      : 0;
  const passCount = rows.filter((r) => r.totalScore >= passMark).length;
  const highestScore =
    rows.length > 0 ? Math.max(...rows.map((r) => r.totalScore)) : 0;

  // question column headers, taken from the first row's shape
  const questionColumns = rows[0]?.questionScores ?? [];

  // shown while no exam has been selected yet (e.g. direct navigation without a card click)
  if (!currentExamId) {
    return (
      <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
        <TeacherSidebar activeItem="examResultsList" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TeacherHeader />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-sm opacity-60">No exam selected.</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      <TeacherSidebar activeItem="examResultsList" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader />

        <main
          className="flex-1 overflow-y-auto px-8 py-6"
          style={{ color: "var(--color-base-content)" }}
        >
          <p className="text-xs opacity-60 mb-2">
            Teacher Portal &gt; Exam Library &gt; Results
          </p>

          {/* shows while the real data is being fetched */}
          {isLoading && (
            <p className="text-sm opacity-60">Loading results...</p>
          )}

          {/* shows if the fetch failed */}
          {error && (
            <p
              className="text-[13px] mb-4"
              style={{ color: "var(--color-error)" }}
            >
              {error}
            </p>
          )}

          {!isLoading && !error && (
            <>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Exam Results: {examTitle}
                  </h1>
                  <p className="text-sm opacity-70">
                    {examCode} &middot; {durationMinutes} min &middot; pass mark{" "}
                    {passMark}
                    &middot; {rows.length} sessions
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium bg-[var(--color-base-100)] hover:opacity-70"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium bg-[var(--color-base-100)] hover:opacity-70"
                  >
                    <FileText size={14} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl p-4 bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
                  <p className="text-xs opacity-60 mb-1">Class Average</p>
                  <p className="text-2xl font-bold">{classAverage}%</p>
                </div>
                <div className="rounded-xl p-4 bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
                  <p className="text-xs opacity-60 mb-1">Pass Rate</p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-success)" }}
                  >
                    {passCount} of {rows.length}
                  </p>
                </div>
                <div className="rounded-xl p-4 bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
                  <p className="text-xs opacity-60 mb-1">Highest Score</p>
                  <p className="text-2xl font-bold">{highestScore}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Detailed Breakdown</h2>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border w-[240px] border-[var(--color-base-300)] bg-[var(--color-base-100)]">
                  <Search size={14} style={{ opacity: 0.5 }} />
                  <input
                    type="text"
                    placeholder="Search student name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-grow text-[13px] outline-none bg-transparent border-none"
                  />
                </div>
              </div>

              {/* shows every session as its own row — multiple rows per student if they retried */}
              <div className="rounded-lg px-3 py-2 mb-3 text-xs bg-[var(--color-base-100)] border border-[var(--color-base-300)] opacity-70">
                Showing one row per attempt — students with multiple attempts
                appear more than once.
              </div>

              <div className="rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-base-300)]">
                      <th className="text-left px-4 py-3 font-medium opacity-60">
                        Student
                      </th>
                      <th className="text-left px-4 py-3 font-medium opacity-60">
                        Attempt
                      </th>
                      <th className="text-left px-4 py-3 font-medium opacity-60">
                        Total
                      </th>
                      {questionColumns.map((q) => (
                        <th
                          key={q.questionId}
                          className="text-left px-4 py-3 font-medium opacity-60"
                        >
                          {q.label} ({q.maxPoints})
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 font-medium opacity-60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={row.sessionId}
                        className="border-b border-[var(--color-base-300)] last:border-0"
                      >
                        <td className="px-4 py-3">{row.studentName}</td>
                        <td className="px-4 py-3">#{row.attemptNumber}</td>
                        <td className="px-4 py-3 font-bold">
                          {row.totalScore}/{row.maxScore}
                        </td>
                        {row.questionScores.map((q) => (
                          <td key={q.questionId} className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <StatusIcon status={q.status} />
                              {q.score}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--color-base-300)] hover:opacity-70"
                          >
                            View Answers
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs opacity-60 mt-3">
                Showing {filtered.length} of {rows.length} sessions
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
