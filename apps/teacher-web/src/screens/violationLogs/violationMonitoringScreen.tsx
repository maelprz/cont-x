import { useId, type ReactNode } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ExamConfirmDialog, ExamDialog, examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useViolationMonitoring } from "../../hooks/useViolationMonitoring";
import { useRouterLogic } from "../../router/routerLogic";
import { CLASS_LOG_LIMIT, formatTimestamp } from "../../services/violationService";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore";
import type { ViolationDetailRow, ViolationSessionRow } from "./violationMonitoringScreen.types";

const DASH = "—";
const tabs = [
  { id: "attempts", label: "Attempts" },
  { id: "log", label: "Activity log" },
] as const;
const wideCell = "@min-[46rem]:table-cell @min-[46rem]:px-3 @min-[46rem]:py-2.5 @min-[46rem]:align-middle";
const rowClass = "grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 @min-[46rem]:table-row";

const violationLabels: Record<ViolationDetailRow["violationType"], string> = {
  alt_tab: "Alt+Tab",
  windows: "Windows key",
  screenshot: "Screenshot",
  copy_paste: "Copy / Paste",
  disallowed_process: "Disallowed app detected",
};

const attemptStatuses: Record<ViolationSessionRow["status"], { label: string; color: string }> = {
  in_progress: { label: "In progress", color: "bg-[#e5eddf] text-[#3d5431]" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-900" },
  timed_out: { label: "Timed out", color: "bg-violet-100 text-violet-900" },
  removed: { label: "Removed", color: "bg-red-100 text-red-800" },
};

function AttemptTable({ label, columns, children }: { label: string; columns: string[]; children: ReactNode }) {
  return (
    <table role="table" aria-label={label} className="block w-full border-collapse @min-[46rem]:table">
      <thead role="rowgroup" className="sr-only @min-[46rem]:not-sr-only @min-[46rem]:table-header-group">
        <tr role="row" className="border-b border-[var(--color-base-300)] text-left text-xs text-stone-600">
          {columns.map((column) => <th key={column} scope="col" role="columnheader" className="px-3 py-2 font-medium">{column}</th>)}
        </tr>
      </thead>
      <tbody role="rowgroup" className="block divide-y divide-[var(--color-base-300)] @min-[46rem]:table-row-group">
        {children}
      </tbody>
    </table>
  );
}

function AttemptCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td role="cell" className={`block min-w-0 text-sm wrap-anywhere ${wideCell}`}>
      <span aria-hidden="true" className="mb-0.5 block text-xs text-stone-600 @min-[46rem]:hidden">{label}</span>
      {children}
    </td>
  );
}

function AttemptStudent({ name, detail }: { name: string; detail: string }) {
  return (
    <th scope="row" role="rowheader" className={`order-first col-span-2 block min-w-0 text-left text-sm font-semibold wrap-anywhere ${wideCell}`}>
      {name}
      {detail && <span className="block text-xs font-normal text-stone-600">{detail}</span>}
    </th>
  );
}

function ViolationDetailDialog({ session, isLoading, error, violations, onClose }: {
  session: ViolationSessionRow | undefined;
  isLoading: boolean;
  error: string | null;
  violations: ViolationDetailRow[];
  onClose: () => void;
}) {
  return (
    <ExamDialog title="Violation details" subtitle={session && `${session.studentName} · Attempt ${session.attemptNumber}`}
      onClose={onClose} dismissOnBackdrop wide
      footer={<button type="button" className={examSecondary} onClick={onClose}>Close</button>}>
      {isLoading && <p role="status" className="text-sm text-stone-600">Loading violations…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!isLoading && !error && (violations.length > 0 ? (
        <ul aria-label="Recorded violations" className="divide-y divide-[var(--color-base-300)]">
          {violations.map((violation) => (
            <li key={violation.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 text-sm wrap-anywhere">
                <h3 className="font-semibold">{violationLabels[violation.violationType]}</h3>
                {violation.details && <p className="mt-0.5 text-stone-700">{violation.details}</p>}
                {violation.questionTitle && <p className="mt-0.5 text-xs text-stone-600">{violation.questionTitle}</p>}
              </div>
              <span className="shrink-0 text-xs text-stone-600 tabular-nums">{violation.loggedAt}</span>
            </li>
          ))}
        </ul>
      ) : <p role="status" className="text-sm text-stone-600">No violations were logged for this attempt.</p>)}
    </ExamDialog>
  );
}

export function ViolationMonitoringScreen() {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const classExamId = useViolationMonitoringStore((state) => state.currentClassExamId);
  const tabId = useId();
  const {
    sessions, header, lastRefreshedAt, isLoading, error, refetch,
    selectedSessionId, violations, isViolationsLoading, violationsError, openViolationModal, closeViolationModal,
    sessionToRemove, isRemoving, removeError, requestRemove, cancelRemove, confirmRemove,
    activeTab, setActiveTab, logEntries, isLogTruncated,
  } = useViolationMonitoring(classExamId);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const activeRows = activeTab === "attempts" ? sessions : logEntries;
  const hasRows = classExamId !== null && activeRows.length > 0;
  const emptyMessage = classExamId === null
    ? "No class exam selected. Open Violation Monitoring from Student Monitoring."
    : isLoading
      ? "Loading " + (activeTab === "attempts" ? "attempts…" : "activity log…")
      : error
        ? null
        : activeTab === "attempts"
          ? "No attempts have been recorded for this class yet."
          : "No violations or removals were recorded for this class exam.";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="examLibrary" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Violation Monitoring" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <button type="button" className={examSecondary} onClick={() => navigateTo("studentMonitoring")}>
                <ArrowLeft size={15} aria-hidden="true" /> Back to Student Monitoring
              </button>
              <button type="button" className={examSecondary} onClick={() => void refetch()} disabled={classExamId === null || isLoading}>
                <RefreshCw size={15} aria-hidden="true" className={isLoading && classExamId !== null ? "motion-safe:animate-spin" : undefined} />
                {isLoading && hasRows ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold wrap-anywhere">{header?.examTitle ?? "Class exam"}</h2>
                {header && <p className="mt-0.5 text-sm text-stone-600 wrap-anywhere">{header.className}</p>}
              </div>
              {classExamId && lastRefreshedAt && (
                <p role="status" className="text-xs text-stone-600">
                  Updated <time dateTime={lastRefreshedAt.toISOString()} className="tabular-nums">{lastRefreshedAt.toLocaleTimeString("en-GB")}</time>
                </p>
              )}
            </div>

            <div role="tablist" aria-label="Monitoring view" className="flex gap-4 border-b border-[var(--color-base-300)]">
              {tabs.map(({ id, label }) => (
                <button key={id} type="button" role="tab" id={tabId + "-" + id}
                  aria-selected={activeTab === id} aria-controls={tabId + "-" + id + "-panel"} tabIndex={activeTab === id ? 0 : -1}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const next = event.key === "Home" ? "attempts" : event.key === "End" ? "log" : id === "attempts" ? "log" : "attempts";
                    setActiveTab(next);
                    document.getElementById(tabId + "-" + next)?.focus();
                  }}
                  className="min-h-10 cursor-pointer border-b-2 border-transparent px-1.5 pb-2 text-sm text-stone-600 focus-visible:outline-2 focus-visible:outline-[#465a3b] aria-selected:border-[#465a3b] aria-selected:font-semibold aria-selected:text-[#465a3b]">
                  {label}
                </button>
              ))}
            </div>

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            {tabs.map(({ id, label }) => (
              <section key={id} role="tabpanel" id={tabId + "-" + id + "-panel"} aria-labelledby={tabId + "-" + id}
                hidden={activeTab !== id} tabIndex={0}
                className="@container min-w-0 overflow-hidden rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] focus-visible:outline-2 focus-visible:outline-[#465a3b]">
                {activeTab === id && (hasRows ? (
                  id === "attempts" ? (
                    <AttemptTable label={label} columns={["Student", "Status", "Joined", "Submitted", "Violations", "Actions"]}>
                      {sessions.map((session) => {
                        const status = attemptStatuses[session.status];
                        const attemptLabel = `${session.studentName}, attempt ${session.attemptNumber}`;
                        return (
                          <tr key={session.id} role="row" className={rowClass}>
                            <AttemptStudent name={session.studentName} detail={`${session.studentIdNumber} · Attempt ${session.attemptNumber}`} />
                            <AttemptCell label="Status">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                            </AttemptCell>
                            <AttemptCell label="Joined">{session.joinedAt}</AttemptCell>
                            <AttemptCell label="Submitted">{session.submittedAt ?? DASH}</AttemptCell>
                            <AttemptCell label="Violations">
                              <button type="button" className={examSecondary}
                                aria-label={`View violations for ${attemptLabel}`} onClick={() => void openViolationModal(session.id)}>
                                {session.violationCount} {session.violationCount === 1 ? "event" : "events"}
                              </button>
                            </AttemptCell>
                            <AttemptCell label="Actions">
                              {session.status === "in_progress" ? (
                                <button type="button" className={examSecondary + " text-red-700"} disabled={isLoading}
                                  aria-label={`Remove ${attemptLabel}`} onClick={() => requestRemove(session)}>
                                  Remove
                                </button>
                              ) : DASH}
                            </AttemptCell>
                          </tr>
                        );
                      })}
                    </AttemptTable>
                  ) : (
                    <AttemptTable label={label} columns={["Time", "Student", "Event", "Details", "Question"]}>
                      {logEntries.map((entry) => (
                        <tr key={entry.id} role="row" className={rowClass}>
                          <AttemptCell label="Time"><time dateTime={entry.occurredAt}>{formatTimestamp(entry.occurredAt)}</time></AttemptCell>
                          <AttemptStudent name={entry.studentName} detail={entry.attemptNumber > 0 ? `Attempt ${entry.attemptNumber}` : ""} />
                          <AttemptCell label="Event">
                            {entry.kind === "removal"
                              ? <span className="font-semibold text-red-700">Removed from exam</span>
                              : entry.violationType ? violationLabels[entry.violationType] : DASH}
                          </AttemptCell>
                          <AttemptCell label="Details">{entry.details ?? DASH}</AttemptCell>
                          <AttemptCell label="Question">{entry.questionTitle ?? DASH}</AttemptCell>
                        </tr>
                      ))}
                    </AttemptTable>
                  )
                ) : emptyMessage && <p role="status" className="px-4 py-5 text-sm text-stone-600">{emptyMessage}</p>)}
              </section>
            ))}

            {activeTab === "log" && classExamId && isLogTruncated && (
              <p className="text-xs text-stone-600">Showing the newest {CLASS_LOG_LIMIT} violations, plus removals.</p>
            )}
          </div>
        </main>
      </div>

      {selectedSessionId !== null && (
        <ViolationDetailDialog session={selectedSession} isLoading={isViolationsLoading} error={violationsError}
          violations={violations} onClose={closeViolationModal} />
      )}

      <ExamConfirmDialog isOpen={sessionToRemove !== null} title="Remove student?"
        message={`${sessionToRemove?.studentName ?? "This student"} will be removed from the exam. Their saved answers will be kept, this attempt will count toward their limit, and they will return to their dashboard shortly.`}
        confirmLabel="Remove student" isProcessing={isRemoving} error={removeError}
        onConfirm={() => void confirmRemove()} onCancel={cancelRemove} />
    </div>
  );
}
