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
import { AdjustScoreModal } from "../../components/examResult/adjustScoreModal";
import { computeQuestionStats } from "../../lib/resultsAnalytics.ts";
import { collectPoolColumns } from "../../lib/resultsPools.ts";
import {
  buildResultsCsv,
  downloadCsv,
  safeFileName,
  scorePercent,
} from "../../lib/resultsCsv";

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

  // reads which class's results to show, set when a card or a Manage Classes row was clicked
  const currentClassExamId = useExamResultsStore(
    (state) => state.currentClassExamId,
  );
  const { data, isLoading, error, refetch } = useExamResults(currentClassExamId);
  const [adjustingRow, setAdjustingRow] = useState<StudentResultRow | null>(null); // attempt being adjusted

  // uses real fetched rows unless a prop override was passed in (e.g. for testing)
  const rows = rowsProp ?? data?.rows ?? [];

  const examTitle = data?.examTitle ?? "";
  const examCode = data?.examCode ?? "";
  const className = data?.className ?? "";
  const durationMinutes = data?.durationMinutes ?? 0;
  const passMark = data?.passMark ?? null; // percent; null means no minimum was set

  // filters rows by student name, case-insensitive
  const filtered = rows.filter((row) =>
    row.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  // derived stats from real rows; the pass mark is a percent, so compare percents
  const classAverage =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => sum + scorePercent(r), 0) / rows.length,
        )
      : 0;
  const passCount =
    passMark === null
      ? 0
      : rows.filter((r) => scorePercent(r) >= passMark).length;
  const highestScore =
    rows.length > 0 ? Math.max(...rows.map((r) => r.totalScore)) : 0;
  // students draw different pooled questions, so show the maximum of whoever scored highest
  const highestRow = rows.find((r) => r.totalScore === highestScore);
  const maxScore = highestRow?.maxScore ?? 0;

  const questionStats = computeQuestionStats(rows); // per-question performance for the panel

  // exports every attempt (not just the searched ones) as the full results sheet
  const handleExportCsv = () => {
    downloadCsv(
      safeFileName(examTitle, className, "results"),
      buildResultsCsv(rows, passMark),
    );
  };

  // question column headers, taken from the first row's shape
  const questionColumns = rows[0]?.questionScores ?? [];
  const poolColumns = collectPoolColumns(rows); // one column per random pool, in exam order

  // shown while no exam has been selected yet (e.g. direct navigation without a card click)
  if (!currentClassExamId) {
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
                    {examCode} &middot; {className} &middot; {durationMinutes} min
                    &middot; pass mark{" "}
                    {passMark === null ? "none" : `${passMark}%`}
                    &middot; {rows.length} sessions
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={rows.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium bg-[var(--color-base-100)] hover:opacity-70 disabled:opacity-40"
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
                    {passMark === null
                      ? "No pass mark"
                      : `${passCount} of ${rows.length}`}
                  </p>
                </div>
                <div className="rounded-xl p-4 bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
                  <p className="text-xs opacity-60 mb-1">Highest Score</p>
                  <p className="text-2xl font-bold">
                    {highestScore}/{maxScore}
                  </p>
                </div>
              </div>

              {questionStats.length > 0 && (
                <div className="rounded-xl mb-6 overflow-x-auto bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
                  <div className="px-4 pt-4 pb-2">
                    <h2 className="text-lg font-bold">Question Performance</h2>
                    <p className="text-xs opacity-60">
                      Based on {rows.length} {rows.length === 1 ? "attempt" : "attempts"}. Full
                      marks means the student earned every point on the question.
                      {poolColumns.length > 0 &&
                        " Random-pool questions are scored per pool in the table below."}
                    </p>
                  </div>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--color-base-300)]">
                        <th className="text-left px-4 py-3 font-medium opacity-60">Question</th>
                        <th className="text-left px-4 py-3 font-medium opacity-60">Average</th>
                        <th className="text-left px-4 py-3 font-medium opacity-60 w-[200px]">
                          Average %
                        </th>
                        <th className="text-left px-4 py-3 font-medium opacity-60">Full marks</th>
                        <th className="text-left px-4 py-3 font-medium opacity-60">Zero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionStats.map((stat) => (
                        <tr
                          key={stat.questionId}
                          className="border-b border-[var(--color-base-300)] last:border-0"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium">{stat.label}</span>
                            <span className="opacity-60"> {stat.title}</span>
                            {stat.isHardest && (
                              <span
                                className="ml-2 text-[11px] font-medium"
                                style={{ color: "var(--color-error)" }}
                              >
                                Hardest
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {Math.round(stat.averageScore * 10) / 10}/{stat.maxPoints}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-[var(--color-base-300)]">
                                <div
                                  className="h-2 rounded-full bg-[var(--color-primary)]"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, stat.averagePercent))}%`,
                                  }}
                                />
                              </div>
                              <span className="w-10 text-right">
                                {Math.round(stat.averagePercent)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{Math.round(stat.fullMarksPercent)}%</td>
                          <td className="px-4 py-3">{Math.round(stat.zeroPercent)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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
                      {poolColumns.map((pool) => (
                        <th
                          key={pool.poolKey}
                          className="text-left px-4 py-3 font-medium opacity-60"
                        >
                          {pool.label} {pool.title}
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
                          {row.scoreAdjustment !== 0 && (
                            <span
                              title={row.adjustmentReason ?? "Adjusted by the teacher"}
                              className="ml-1.5 text-[11px] font-medium opacity-60"
                            >
                              ({row.scoreAdjustment > 0 ? "+" : ""}
                              {row.scoreAdjustment} adj.)
                            </span>
                          )}
                        </td>
                        {row.questionScores.map((q) => (
                          <td key={q.questionId} className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <StatusIcon status={q.status} />
                              {q.score}
                            </span>
                          </td>
                        ))}
                        {poolColumns.map((pool) => {
                          const cell = row.poolScores.find((c) => c.poolKey === pool.poolKey);
                          return (
                            <td key={pool.poolKey} className="px-4 py-3">
                              {cell ? `${cell.score}/${cell.maxPoints}` : "-"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--color-base-300)] hover:opacity-70"
                            >
                              View Answers
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustingRow(row)}
                              className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--color-base-300)] hover:opacity-70"
                            >
                              Adjust Score
                            </button>
                          </div>
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

      {adjustingRow && (
        <AdjustScoreModal
          key={adjustingRow.sessionId} // fresh form state for each attempt
          row={adjustingRow}
          onClose={() => setAdjustingRow(null)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}