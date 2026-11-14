import { TeacherHeader } from "../../components/layout/teacherHeader"; 
import { TeacherSidebar } from "../../components/layout/teacherSidebar"; 
import { useRouterLogic } from "../../router/routerLogic";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore"; 
import { useStudentMonitoring } from "../../hooks/useStudentMonitoring"; 
import { useState } from "react"; 
import { MovementHistoryModal } from "../../components/studentMonitoring/movementHistoryModal"; 
import type {
  MonitoringStatus,
  StudentMonitoringRow,
} from "./studentMonitoringScreen.types";

const DASH = "\u2014"; // shown when a value does not apply

const buttonClass =
  "px-3 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 border-[var(--color-base-300)] bg-[var(--color-base-100)] text-[var(--color-base-content)] disabled:opacity-50 disabled:cursor-not-allowed";

const violationsButtonClass =
  "px-3 py-2 rounded-lg border text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-80 border-transparent bg-[var(--color-error)] text-white";

// label plus a soft background and a dark text color for each status badge, chosen so the text stays readable on white
const STATUS_STYLE: Record<MonitoringStatus, { label: string; bg: string; text: string }> = {
  not_joined: { label: "Not joined", bg: "#E5E7EB", text: "#374151" },
  in_progress: { label: "In Progress", bg: "#DCFCE7", text: "#166534" }, 
  offline: { label: "Offline", bg: "#FEF3C7", text: "#92400E" }, 
  submitted: { label: "Submitted", bg: "#DBEAFE", text: "#1E40AF" },
  timed_out: { label: "Timed Out", bg: "#EDE9FE", text: "#5B21B6" }, 
  removed: { label: "Removed", bg: "#FEE2E2", text: "#991B1B" }, 
};

// turns seconds into "12s ago", "3m ago", or "1h ago"
function formatSeen(seconds: number | null): string {
  if (seconds === null) return DASH; // never reported
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// the colored pill showing a student's status
function StatusBadge({ row }: { row: StudentMonitoringRow }) {
  const style = STATUS_STYLE[row.status]; 
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" 
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
      {row.status === "in_progress" && row.isFocused === false && (
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" 
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }} 
        >
          Window not in front
        </span>
      )}
    </div>
  );
}

// answered out of total, as a small bar plus the numbers
function ProgressCell({ row }: { row: StudentMonitoringRow }) {
  if (row.totalQuestions === null || row.answeredCount === null) return <span className="opacity-60">{DASH}</span>;
  const pct = row.totalQuestions > 0 ? Math.min(100, Math.round((row.answeredCount / row.totalQuestions) * 100)) : 0; 
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full overflow-hidden bg-[var(--color-base-300)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--color-primary)" }} />
      </div>
      <span className="text-[12px] opacity-80">
        {row.answeredCount}/{row.totalQuestions}
      </span>
    </div>
  );
}

export function StudentMonitoringScreen() {
  const navigateTo = useRouterLogic((state) => state.navigateTo); 
  const classExamId = useViolationMonitoringStore((state) => state.currentClassExamId); 
  const { rows, header, isLoading, error, refetch, lastRefreshedAt, summary } = useStudentMonitoring(classExamId);
  const [historyTarget, setHistoryTarget] = useState<{ sessionId: string; studentName: string } | null>(null); 

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      {}
      <TeacherSidebar activeItem="examLibrary" /> {}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader /> {}
        <main className="flex-1 overflow-y-auto px-8 py-6" style={{ color: "var(--color-base-content)" }}>
          <p className="text-xs opacity-60 mb-2">Teacher Portal &gt; Exam Library &gt; Student Monitoring</p> {}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Student Monitoring</h1> {}
              <p className="text-sm opacity-70 max-w-md leading-relaxed">
                {header
                  ? `Live view of "${header.examTitle}" in ${header.className}.` 
                  : "Live view of the students in this class exam."}
              </p>
              {classExamId !== null && !error && rows.length > 0 && (
                <p className="text-[12px] opacity-60 mt-1">
                  {summary.total} students: {summary.inProgress} in progress, {summary.offline} offline, {summary.notJoined} not joined, {summary.finished} finished
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2"> {}
                <button onClick={() => navigateTo("violationMonitoring")} className={violationsButtonClass}>
                  Violations
                </button>
                <button onClick={() => void refetch()} disabled={isLoading} className={buttonClass}>
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {lastRefreshedAt && (
                <span className="text-[11px] opacity-60">Updated {lastRefreshedAt.toLocaleTimeString("en-GB")}</span> 
              )}
            </div>
          </div>

          {error && (
            <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          )}

          <div className="rounded-2xl border overflow-hidden bg-[var(--color-base-100)] border-[var(--color-base-300)]">
            <table className="w-full text-[13px] text-[var(--color-base-content)]">
              <thead>
                <tr className="text-left border-b border-[var(--color-base-300)] opacity-60">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">ID Number</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Current Question</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Last Seen</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                  <th className="px-5 py-3 font-medium">History</th>
                </tr>
              </thead>
              <tbody>
                {classExamId === null && (
                  <tr>
                    <td colSpan={8} className="px-5 py-6 text-center opacity-60">
                      No class exam selected. Open this screen from an exam card.
                    </td>
                  </tr>
                )}

                {classExamId !== null && isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-6 text-center opacity-60">
                      Loading students...
                    </td>
                  </tr>
                )}

                {classExamId !== null && !isLoading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-6 text-center opacity-60">
                      No students are enrolled in this class yet.
                    </td>
                  </tr>
                )}

                {classExamId !== null &&
                  rows.map((row) => {
                    const showPosition = row.status === "in_progress" || row.status === "offline"; 
                    const sessionId = row.sessionId;
                    return (
                      <tr key={row.studentId} className="border-t border-[var(--color-base-300)]">
                        <td className="px-5 py-3">
                          {row.studentName}
                          {row.attemptNumber !== null && row.attemptNumber > 1 ? ` (Attempt ${row.attemptNumber})` : ""}
                        </td>
                        <td className="px-5 py-3 opacity-80">{row.studentIdNumber}</td>
                        <td className="px-5 py-3">
                          <StatusBadge row={row} />
                        </td>
                        <td className="px-5 py-3 opacity-80">
                          {showPosition && row.currentPosition !== null && row.totalQuestions !== null
                            ? `Q${row.currentPosition} of ${row.totalQuestions}`
                            : DASH}
                        </td>
                        <td className="px-5 py-3">
                          <ProgressCell row={row} />
                        </td>
                        <td className="px-5 py-3 opacity-80">{formatSeen(row.secondsSinceSeen)}</td>
                        <td
                          className="px-5 py-3 font-bold"
                          style={row.violationCount > 0 ? { color: "var(--color-error)" } : undefined} 
                        >
                          {row.violationCount}
                        </td>
                        <td className="px-5 py-3">
                          {sessionId !== null ? (
                            <button
                              onClick={() => setHistoryTarget({ sessionId, studentName: row.studentName })} 
                              className="text-[13px] font-semibold cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70 text-[var(--color-secondary)]"
                            >
                              View
                            </button>
                          ) : (
                            <span className="opacity-60">{DASH}</span> 
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <MovementHistoryModal
        sessionId={historyTarget?.sessionId ?? null} 
        studentName={historyTarget?.studentName ?? ""} 
        onClose={() => setHistoryTarget(null)} 
      />
    </div>
  );
}