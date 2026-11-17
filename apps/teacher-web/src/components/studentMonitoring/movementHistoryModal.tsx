import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMovementHistory } from "../../hooks/useMovementHistory";
import { useStudentAttempts } from "../../hooks/useStudentAttempts";
import type { MovementHistoryKind, MovementHistorySummary } from "../../screens/studentMonitoring/studentMonitoringScreen.types";
import { ExamDialog, examSecondary } from "../examLibrary/examDialog";
import { TeacherSelect } from "../shared/teacherSelect";
import { Pagination } from "../shared/pagination";
import { usePagination } from "../../hooks/usePagination";

const eventColors: Record<MovementHistoryKind, string> = {
  joined: "bg-stone-500",
  question_navigated: "bg-blue-600",
  focus_lost: "bg-amber-600",
  focus_gained: "bg-green-600",
  submitted: "bg-blue-800",
  timed_out: "bg-violet-700",
  removed: "bg-red-700",
};

function formatAway(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
}

function summaryText(summary: MovementHistorySummary): string {
  return `Left the window ${summary.windowLeftCount} time${summary.windowLeftCount === 1 ? "" : "s"}, away ${formatAway(summary.totalAwaySeconds)} in total, changed question ${summary.questionChanges} time${summary.questionChanges === 1 ? "" : "s"}.`;
}

export function MovementHistoryModal({ classExamId, studentId, studentName, onClose }: {
  classExamId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const attemptsState = useStudentAttempts(classExamId, studentId);
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null);
  const { attempts } = attemptsState;
  const activeSessionId = attempts.find((attempt) => attempt.sessionId === pickedSessionId)?.sessionId
    ?? attempts.at(-1)?.sessionId ?? null;
  const history = useMovementHistory(activeSessionId);
  const page = usePagination(history.entries, 12, activeSessionId ?? "");
  const isRefreshing = attemptsState.isLoading || history.isLoading;
  const error = attemptsState.error ?? history.error;

  function refresh() {
    void attemptsState.refetch();
    void history.refetch();
  }

  return (
    <ExamDialog title="Movement history" subtitle={studentName} onClose={onClose} dismissOnBackdrop wide
      footer={<>
        <button type="button" className={examSecondary} onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={15} aria-hidden="true" className={isRefreshing ? "motion-safe:animate-spin" : undefined} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" className={examSecondary} onClick={onClose}>Close</button>
      </>}>
      {attempts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="movement-history-attempt" className="text-sm font-medium">Attempt</label>
          <TeacherSelect id="movement-history-attempt" label="Attempt" className="w-40"
            value={activeSessionId} onChange={setPickedSessionId}
            options={attempts.map((attempt) => ({ value: attempt.sessionId, label: `Attempt ${attempt.attemptNumber}` }))} />
        </div>
      )}

      {isRefreshing && history.entries.length === 0 && <p role="status" className="text-sm text-stone-600">Loading history…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {!isRefreshing && !error && history.entries.length === 0 && (
        <p role="status" className="text-sm text-stone-600">
          {activeSessionId === null ? "This student has no attempts yet." : "No activity has been recorded for this attempt."}
        </p>
      )}

      {history.entries.length > 0 && (
        <>
          {!error && <p className="mb-3 text-xs text-stone-600">{summaryText(history.summary)}</p>}
          <ol aria-label="Movement events, newest first" className="divide-y divide-[var(--color-base-300)]">
            {page.items.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2.5 py-2.5">
                <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${eventColors[entry.kind]}`} />
                <div className="min-w-0 flex-1 wrap-anywhere">
                  <p className="text-sm">{entry.label}</p>
                  {entry.detail && <p className="mt-0.5 text-xs text-stone-600">{entry.detail}</p>}
                </div>
                <time dateTime={entry.happenedAt} className="shrink-0 text-xs text-stone-600 tabular-nums">
                  {new Date(entry.happenedAt).toLocaleTimeString("en-GB")}
                </time>
              </li>
            ))}
          </ol>
          <Pagination label="Movement history pages" {...page} />
        </>
      )}
      {history.isTruncated && <p className="mt-3 text-xs text-stone-600">Showing the newest 500 events.</p>}
    </ExamDialog>
  );
}
