import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Download, Ellipsis, Pencil, Search, List } from "lucide-react";
import { ExamDialog, examField, examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { Pagination } from "../../components/shared/pagination";
import { AdjustScoreModal } from "../../components/examResult/adjustScoreModal";
import { KeystrokeCsvButton } from "../../components/examResult/keystrokeCsvButton";
import { useExamResults } from "../../hooks/useExamResults";
import { usePagination } from "../../hooks/usePagination";
import { computeQuestionPerformance } from "../../lib/resultsAnalytics";
import { buildResultsCsv, downloadCsv, safeFileName, scorePercent } from "../../lib/resultsCsv";
import { collectPoolColumns } from "../../lib/resultsPools";
import { formatOvertime } from "../../lib/overtime";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamResultsStore } from "../../store/useExamResultsStore";
import type { ExamResultsScreenProps, StudentResultRow } from "./examResultsScreen.types";

const tabs = [{ id: "attempts", label: "Student attempts" }, { id: "questions", label: "Question performance" }] as const;
const panel = "@container min-w-0 rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)]";
const rowClass = "grid grid-cols-2 gap-2 px-4 py-3 @min-[42rem]:table-row";
const cellClass = "block min-w-0 text-sm wrap-anywhere @min-[42rem]:table-cell @min-[42rem]:px-3 @min-[42rem]:py-2.5 @min-[42rem]:align-middle";
const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#465a3b] disabled:opacity-50";
const points = (value: number) => Math.round(value * 10) / 10;

function ResultsTable({ label, columns, children }: { label: string; columns: string[]; children: ReactNode }) {
  return (
    <table role="table" aria-label={label} className="block w-full border-collapse @min-[42rem]:table">
      <thead role="rowgroup" className="sr-only @min-[42rem]:not-sr-only @min-[42rem]:table-header-group">
        <tr role="row" className="border-b border-[var(--color-base-300)] text-left text-xs text-stone-600">
          {columns.map((column) => <th scope="col" role="columnheader" key={column} className="px-3 py-2 font-medium">{column}</th>)}
        </tr>
      </thead>
      <tbody role="rowgroup" className="block divide-y divide-[var(--color-base-300)] @min-[42rem]:table-row-group">{children}</tbody>
    </table>
  );
}

function ResultCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td role="cell" className={cellClass}>
      <span aria-hidden="true" className="block text-xs text-stone-600 @min-[42rem]:hidden">{label}</span>
      {children}
    </td>
  );
}

function AttemptActions({ row, classExamId, examTitle, className, onBreakdown, onAdjust }: {
  row: StudentResultRow;
  classExamId: string;
  examTitle: string;
  className: string;
  onBreakdown: () => void;
  onAdjust: () => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  function positionMenu() {
    const anchor = trigger.current;
    const popup = menu.current;
    if (!anchor || !popup) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(208, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const flip = below < 132 && above > below;
    Object.assign(popup.style, {
      width: width + "px",
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) + "px",
      top: flip ? "auto" : rect.bottom + 6 + "px",
      bottom: flip ? window.innerHeight - rect.top + 6 + "px" : "auto",
      maxHeight: Math.max(0, flip ? above : below) + "px",
    });
  }

  return (
    <>
      <button type="button" ref={trigger} popoverTarget={id} aria-controls={id} className={examSecondary}
        aria-label={`Actions for ${row.studentName}, attempt ${row.attemptNumber}`}>
        <Ellipsis size={16} aria-hidden="true" />
      </button>
      <div ref={menu} id={id} popover="auto" role="group" aria-label="Attempt actions" onBeforeToggle={positionMenu}
        className="fixed inset-auto m-0 overflow-y-auto rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-1 text-[var(--color-base-content)] shadow-lg">
        <button type="button" className={menuItem} onClick={() => { menu.current?.hidePopover(); onBreakdown(); }}>
          <List size={14} aria-hidden="true" /> Breakdown
        </button>
        <button type="button" className={menuItem} onClick={() => { menu.current?.hidePopover(); onAdjust(); }}>
          <Pencil size={14} aria-hidden="true" /> Adjust score
        </button>
        <KeystrokeCsvButton row={row} classExamId={classExamId} examTitle={examTitle} className={className} buttonClassName={menuItem} />
      </div>
    </>
  );
}

function ScoreBreakdown({ row, poolLabels, onClose }: {
  row: StudentResultRow;
  poolLabels: Map<string, string>;
  onClose: () => void;
}) {
  const items = [
    ...row.questionScores.map((q) => ({ key: q.questionId, label: q.label + " · " + q.title, score: `${points(q.score)} / ${points(q.maxPoints)}`, detail: undefined })),
    ...row.poolScores.map((pool) => ({
      key: "pool-" + pool.poolKey, label: (poolLabels.get(pool.poolKey) ?? "Pool") + " · " + pool.title,
      score: `${points(pool.score)} / ${points(pool.maxPoints)}`,
      detail: pool.questions.map((question) => `${question.title} · ${points(question.score)} / ${points(question.maxPoints)}`).join(" · "),
    })),
  ];
  const page = usePagination(items);
  return (
    <ExamDialog title="Score breakdown" subtitle={`${row.studentName} · Attempt ${row.attemptNumber}`} onClose={onClose} dismissOnBackdrop wide
      footer={<button type="button" className={examSecondary} onClick={onClose}>Close</button>}>
      <p className="text-sm font-semibold tabular-nums">Total {points(row.totalScore)} / {points(row.maxScore)}</p>
      <ul className="mt-3 divide-y divide-[var(--color-base-300)] border-t border-[var(--color-base-300)] text-sm">
        {page.items.map((item) => (
          <li key={item.key} className="flex justify-between gap-3 py-2.5">
            <div className="min-w-0 wrap-anywhere">
              <p>{item.label}</p>
              {item.detail && <p className="mt-0.5 text-xs text-stone-600">{item.detail}</p>}
            </div>
            <span className="shrink-0 tabular-nums">{item.score}</span>
          </li>
        ))}
      </ul>
      <Pagination label="Score breakdown pages" {...page} />
      {row.overtimeSeconds > 0 && (
        <p className="border-t border-[var(--color-base-300)] pt-2 text-sm text-stone-700">
          Overtime {formatOvertime(row.overtimeSeconds)} · −{points(row.overtimeDeduction ?? 0)} points
        </p>
      )}
      {row.scoreAdjustment !== 0 && (
        <div className="border-t border-[var(--color-base-300)] py-2 text-sm">
          <p>Score adjustment {row.scoreAdjustment > 0 ? "+" : ""}{points(row.scoreAdjustment)}</p>
          {row.adjustmentReason && <p className="text-xs text-stone-600 wrap-anywhere">{row.adjustmentReason}</p>}
        </div>
      )}
    </ExamDialog>
  );
}

export function ExamResultsScreen({ rows: rowsProp }: ExamResultsScreenProps) {
  const classExamId = useExamResultsStore((state) => state.currentClassExamId);
  const { data, isLoading, error, refetch } = useExamResults(classExamId);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"attempts" | "questions">("attempts");
  const [dialog, setDialog] = useState<{ kind: "breakdown" | "adjust"; row: StudentResultRow } | null>(null);
  const tabId = useId();

  const rows = rowsProp ?? data?.rows ?? [];
  const examTitle = data?.examTitle ?? "";
  const className = data?.className ?? "";
  const passMark = data?.passMark ?? null;
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => row.studentName.toLowerCase().includes(query));
  const attemptsPage = usePagination(filtered, 10, JSON.stringify([classExamId, query]));
  const classAverage = rows.length ? Math.round(rows.reduce((sum, row) => sum + scorePercent(row), 0) / rows.length) : 0;
  const passCount = passMark === null ? 0 : rows.filter((row) => scorePercent(row) >= passMark).length;
  const highest = rows.reduce<StudentResultRow | null>((best, row) => !best || row.totalScore > best.totalScore ? row : best, null);
  const performance = computeQuestionPerformance(rows);
  const questionRows = [
    ...performance.fixed.map((stat) => ({ ...stat, key: "fixed-" + stat.questionId, note: "" })),
    ...performance.pooled.map((stat) => ({ ...stat, label: stat.poolLabel, note: stat.poolTitle })),
  ];
  const questionsPage = usePagination(questionRows, 10, classExamId ?? "");
  const poolLabels = new Map(collectPoolColumns(rows).map((pool) => [pool.poolKey, pool.label]));
  const showingResults = classExamId !== null && !isLoading && !error;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="examResultsList" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Exam Results" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className={examSecondary} onClick={() => navigateTo("examResultsList")}>
                <ArrowLeft size={15} aria-hidden="true" /> Back to results
              </button>
              {showingResults && <button type="button" className={examPrimary} disabled={!rows.length}
                onClick={() => downloadCsv(safeFileName(examTitle, className, "results"), buildResultsCsv(rows, passMark))}>
                <Download size={15} aria-hidden="true" /> Export CSV
              </button>}
            </div>
            {classExamId === null ? <p role="status" className="text-sm text-stone-600">No class exam selected.</p>
              : isLoading ? <p role="status" className="text-sm text-stone-600">Loading results…</p>
              : error ? <div className="flex flex-wrap items-center gap-3">
                <p role="alert" className="text-sm text-red-700">{error}</p>
                <button type="button" className={examSecondary} onClick={refetch}>Retry</button>
              </div>
              : <>
                <div>
                  <h2 className="text-lg font-semibold wrap-anywhere">{examTitle || "Class exam"}</h2>
                  {data && <p className="mt-0.5 text-sm text-stone-600 wrap-anywhere">
                    {className} · {data.examCode} · {data.durationMinutes} min · Pass mark {passMark === null ? "not set" : passMark + "%"}
                  </p>}
                </div>
                <dl className="grid grid-cols-3 divide-x divide-[var(--color-base-300)] rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] tabular-nums">
                  {[
                    ["Class average", rows.length ? classAverage + "%" : "—"],
                    ["Passed", passMark === null ? "—" : passCount + " / " + rows.length],
                    ["Highest score", highest ? points(highest.totalScore) + " / " + points(highest.maxScore) : "—"],
                  ].map(([label, value]) => (
                    <div className="min-w-0 px-2 py-2 sm:px-4 sm:py-3" key={label}>
                      <dt className="text-xs text-stone-600">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold wrap-anywhere sm:text-xl">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div role="tablist" aria-label="Results view" className="flex flex-wrap gap-4 border-b border-[var(--color-base-300)]">
                  {tabs.map(({ id, label }) => (
                    <button type="button" role="tab" key={id} id={tabId + "-" + id} aria-selected={tab === id}
                      aria-controls={tabId + "-" + id + "-panel"} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}
                      onKeyDown={(event) => {
                        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const next = event.key === "Home" ? "attempts" : event.key === "End" ? "questions" : id === "attempts" ? "questions" : "attempts";
                        setTab(next);
                        document.getElementById(tabId + "-" + next)?.focus();
                      }}
                      className="min-h-10 cursor-pointer border-b-2 border-transparent px-1.5 pb-2 text-sm text-stone-600 focus-visible:outline-2 focus-visible:outline-[#465a3b] aria-selected:border-[#465a3b] aria-selected:font-semibold aria-selected:text-[#465a3b]">
                      {label}
                    </button>
                  ))}
                </div>
                <section role="tabpanel" id={tabId + "-attempts-panel"} aria-labelledby={tabId + "-attempts"} hidden={tab !== "attempts"}>
                  {tab === "attempts" && <div className="space-y-3">
                    {rows.length > 0 && (
                      <label className="relative block max-w-xs">
                        <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
                        <input type="search" aria-label="Search students" placeholder="Search students" value={search}
                          onChange={(event) => setSearch(event.target.value)} className={examField + " pl-9"} />
                      </label>
                    )}
                    <div className={panel}>
                      {filtered.length ? (
                        <>
                          <ResultsTable label="Student attempts" columns={["Student", "Total", "Overtime", "Actions"]}>
                            {attemptsPage.items.map((row) => (
                              <tr key={row.sessionId} role="row" className={rowClass}>
                                <th scope="row" role="rowheader" className={"col-span-2 text-left font-semibold " + cellClass}>
                                  {row.studentName}
                                  <span className="block text-xs font-normal text-stone-600">
                                    Attempt {row.attemptNumber}{row.studentIdNumber ? " · " + row.studentIdNumber : ""}
                                  </span>
                                </th>
                                <ResultCell label="Total">
                                  <strong className="tabular-nums">{points(row.totalScore)} / {points(row.maxScore)}</strong>
                                  <span className="block text-xs text-stone-600">
                                    {Math.round(scorePercent(row))}%{passMark !== null ? (scorePercent(row) >= passMark ? " · Passed" : " · Below pass mark") : ""}
                                  </span>
                                  {row.scoreAdjustment !== 0 && <span className="block text-xs text-stone-600">{row.scoreAdjustment > 0 ? "+" : ""}{points(row.scoreAdjustment)} adjustment</span>}
                                </ResultCell>
                                <ResultCell label="Overtime">
                                  {row.overtimeSeconds > 0 ? formatOvertime(row.overtimeSeconds) + " · −" + points(row.overtimeDeduction ?? 0) + " points" : "—"}
                                </ResultCell>
                                <ResultCell label="Actions">
                                  <AttemptActions row={row} classExamId={classExamId} examTitle={examTitle} className={className}
                                    onBreakdown={() => setDialog({ kind: "breakdown", row })} onAdjust={() => setDialog({ kind: "adjust", row })} />
                                </ResultCell>
                              </tr>
                            ))}
                          </ResultsTable>
                          <Pagination label="Student attempt pages" {...attemptsPage} />
                        </>
                      ) : <p role="status" className="p-4 text-sm text-stone-600">{query ? "No students match your search." : "No graded attempts yet."}</p>}
                    </div>
                  </div>}
                </section>
                <section role="tabpanel" id={tabId + "-questions-panel"} aria-labelledby={tabId + "-questions"} hidden={tab !== "questions"} tabIndex={0}>
                  {tab === "questions" && <div className={panel}>
                    {questionRows.length ? (
                      <>
                        <ResultsTable label="Question performance" columns={["Question", "Average", "Full marks", "Zero points", "Graded attempts"]}>
                          {questionsPage.items.map((stat) => (
                            <tr key={stat.key} role="row" className={rowClass}>
                              <th scope="row" role="rowheader" className={"col-span-2 text-left font-semibold " + cellClass}>
                                {stat.label} · {stat.title}
                                {stat.note && <span className="block text-xs font-normal text-stone-600">{stat.note}</span>}
                                {stat.isHardest && <span className="block text-xs font-medium text-red-700">Hardest</span>}
                              </th>
                              <ResultCell label="Average">{points(stat.averageScore)} / {points(stat.maxPoints)} <span className="block text-xs text-stone-600">{Math.round(stat.averagePercent)}%</span></ResultCell>
                              <ResultCell label="Full marks">{Math.round(stat.fullMarksPercent)}%</ResultCell>
                              <ResultCell label="Zero points">{Math.round(stat.zeroPercent)}%</ResultCell>
                              <ResultCell label="Graded attempts">{stat.attempts}</ResultCell>
                            </tr>
                          ))}
                        </ResultsTable>
                        <Pagination label="Question performance pages" {...questionsPage} />
                      </>
                    ) : <p role="status" className="p-4 text-sm text-stone-600">No question performance data yet.</p>}
                  </div>}
                </section>
              </>}
          </div>
        </main>
      </div>
      {dialog?.kind === "breakdown" && <ScoreBreakdown key={dialog.row.sessionId} row={dialog.row} poolLabels={poolLabels} onClose={() => setDialog(null)} />}
      {dialog?.kind === "adjust" && <AdjustScoreModal key={dialog.row.sessionId} row={dialog.row} onClose={() => setDialog(null)} onSaved={refetch} />}
    </div>
  );
}
