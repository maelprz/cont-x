import { useState, type ReactNode } from "react";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import { examButton, examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { MovementHistoryModal } from "../../components/studentMonitoring/movementHistoryModal";
import { Pagination } from "../../components/shared/pagination";
import { usePagination } from "../../hooks/usePagination";
import { useStudentMonitoring } from "../../hooks/useStudentMonitoring";
import { useRouterLogic } from "../../router/routerLogic";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore";
import type { MonitoringStatus, StudentMonitoringRow } from "./studentMonitoringScreen.types";

const DASH = "—";
const wideCell = "@min-[46rem]:table-cell @min-[46rem]:px-3 @min-[46rem]:py-2.5 @min-[46rem]:align-middle";
const rosterColumns = ["Student", "Status", "Question", "Answered", "Last seen", "Violations", "History"];
const statusStyles: Record<MonitoringStatus, { label: string; color: string }> = {
  not_joined: { label: "Not joined", color: "bg-stone-200 text-stone-700" },
  in_progress: { label: "In progress", color: "bg-[#e5eddf] text-[#3d5431]" },
  offline: { label: "Offline", color: "bg-amber-100 text-amber-900" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-900" },
  timed_out: { label: "Timed out", color: "bg-violet-100 text-violet-900" },
  removed: { label: "Removed", color: "bg-red-100 text-red-800" },
};

function formatSeen(seconds: number | null): string {
  if (seconds === null) return DASH;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function RosterCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td role="cell" className={`block min-w-0 text-sm wrap-anywhere ${wideCell}`}>
      <span aria-hidden="true" className="mb-0.5 block text-xs text-stone-600 @min-[46rem]:hidden">{label}</span>
      {children}
    </td>
  );
}

function ProgressCell({ row }: { row: StudentMonitoringRow }) {
  if (row.totalQuestions === null || row.answeredCount === null) return DASH;
  const percentage = row.totalQuestions > 0
    ? Math.min(100, (row.answeredCount / row.totalQuestions) * 100)
    : 0;
  return (
    <div className="flex max-w-28 flex-col gap-1 text-xs tabular-nums">
      <div aria-hidden="true" className="h-1.5 min-w-10 overflow-hidden rounded-full bg-[var(--color-base-300)]">
        <div className="h-full rounded-full bg-[#465a3b]" style={{ width: `${percentage}%` }} />
      </div>
      <span>{row.answeredCount} / {row.totalQuestions}</span>
    </div>
  );
}

export function StudentMonitoringScreen() {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const classExamId = useViolationMonitoringStore((state) => state.currentClassExamId);
  const returnScreen = useViolationMonitoringStore((state) => state.returnScreen);
  const returnLabel = returnScreen === "dashboard" ? "Dashboard" : "Exam Library";
  const { rows, header, isLoading, error, refetch, lastRefreshedAt, summary } = useStudentMonitoring(classExamId);
  const [historyTarget, setHistoryTarget] = useState<{ studentId: string; studentName: string } | null>(null);
  const rosterPage = usePagination(rows, 10, classExamId ?? "");
  const hasRoster = classExamId !== null && rows.length > 0;
  const emptyMessage = classExamId === null
    ? "No class exam selected. Open Student Monitoring from a class exam."
    : isLoading
      ? "Loading students…"
      : error
        ? null
        : "No students are enrolled in this class yet.";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="examLibrary" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Student Monitoring" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <button type="button" className={examSecondary} onClick={() => navigateTo(returnScreen)}>
                <ArrowLeft size={15} aria-hidden="true" /> Back to {returnLabel}
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={examSecondary} onClick={() => void refetch()} disabled={classExamId === null || isLoading}>
                  <RefreshCw size={15} aria-hidden="true" className={isLoading && classExamId !== null ? "motion-safe:animate-spin" : undefined} />
                  {isLoading && hasRoster ? "Refreshing…" : "Refresh"}
                </button>
                <button type="button" className={`${examButton} border-red-200 bg-red-50 text-red-800 hover:bg-red-100`} disabled={classExamId === null}
                  onClick={() => navigateTo("violationMonitoring")}>
                  <ShieldAlert size={15} aria-hidden="true" /> Violations
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold wrap-anywhere">{header?.examTitle ?? "Class exam"}</h2>
              {header && <p className="mt-0.5 text-sm text-stone-600 wrap-anywhere">{header.className}</p>}
            </div>

            {hasRoster && (
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[var(--color-base-300)] pb-3 text-xs text-stone-600">
                <ul aria-label="Class summary" className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                  <li><strong className="font-semibold text-[var(--color-base-content)]">{summary.total}</strong> enrolled</li>
                  <li><span aria-hidden="true" className="me-1.5 inline-block size-1.5 rounded-full bg-[#465a3b] align-middle" />{summary.inProgress} in progress</li>
                  <li><span aria-hidden="true" className="me-1.5 inline-block size-1.5 rounded-full bg-amber-700 align-middle" />{summary.offline} offline</li>
                  <li>{summary.notJoined} not joined</li>
                  <li>{summary.finished} finished</li>
                </ul>
                {lastRefreshedAt && (
                  <p role="status">Updated <time dateTime={lastRefreshedAt.toISOString()} className="tabular-nums">{lastRefreshedAt.toLocaleTimeString("en-GB")}</time></p>
                )}
              </div>
            )}

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <section aria-labelledby="class-roster-heading" className="@container min-w-0 overflow-hidden rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)]">
              <h2 id="class-roster-heading" className="border-b border-[var(--color-base-300)] px-4 py-3 text-sm font-semibold">Class roster</h2>
              {hasRoster ? (
                <><table role="table" aria-labelledby="class-roster-heading" className="block w-full border-collapse @min-[46rem]:table">
                  <thead role="rowgroup" className="sr-only @min-[46rem]:not-sr-only @min-[46rem]:table-header-group">
                    <tr role="row" className="border-b border-[var(--color-base-300)] text-left text-xs text-stone-600">
                      {rosterColumns.map((label) => <th key={label} scope="col" role="columnheader" className="px-3 py-2 font-medium">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="block divide-y divide-[var(--color-base-300)] @min-[46rem]:table-row-group">
                    {rosterPage.items.map((row) => {
                      const showPosition = row.status === "in_progress" || row.status === "offline";
                      const status = statusStyles[row.status];
                      return (
                        <tr key={row.studentId} role="row" className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 @min-[46rem]:table-row">
                          <th scope="row" role="rowheader" className={`col-span-2 block min-w-0 text-left text-sm font-semibold wrap-anywhere ${wideCell}`}>
                            {row.studentName}
                            <span className="block text-xs font-normal text-stone-600">
                              {row.studentIdNumber}
                              {row.attemptNumber !== null && row.attemptNumber > 1 && ` · Attempt ${row.attemptNumber}`}
                            </span>
                          </th>
                          <RosterCell label="Status">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                            {row.status === "in_progress" && row.isFocused === false && <span className="mt-1 block text-xs font-medium text-amber-900">Window not in front</span>}
                          </RosterCell>
                          <RosterCell label="Question">
                            {showPosition && row.currentPosition !== null && row.totalQuestions !== null
                              ? `Q${row.currentPosition} of ${row.totalQuestions}` : DASH}
                          </RosterCell>
                          <RosterCell label="Answered"><ProgressCell row={row} /></RosterCell>
                          <RosterCell label="Last seen"><span className="tabular-nums">{formatSeen(row.secondsSinceSeen)}</span></RosterCell>
                          <RosterCell label="Violations"><span className={row.violationCount > 0 ? "font-semibold text-red-700" : undefined}>{row.violationCount}</span></RosterCell>
                          <RosterCell label="History">
                            {row.sessionId !== null ? (
                              <button type="button" className={examSecondary} aria-label={`Movement history for ${row.studentName}`}
                                onClick={() => setHistoryTarget({ studentId: row.studentId, studentName: row.studentName })}>
                                History
                              </button>
                            ) : DASH}
                          </RosterCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table><Pagination label="Student roster pages" {...rosterPage} /></>
              ) : emptyMessage && <p role="status" className="px-4 py-5 text-sm text-stone-600">{emptyMessage}</p>}
            </section>
          </div>
        </main>
      </div>

      {classExamId !== null && historyTarget && (
        <MovementHistoryModal key={classExamId + ":" + historyTarget.studentId}
          classExamId={classExamId} studentId={historyTarget.studentId} studentName={historyTarget.studentName}
          onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
