import { useState } from "react";
import { useMovementHistory } from "../../hooks/useMovementHistory";
import { useStudentAttempts } from "../../hooks/useStudentAttempts"; 
import type {
  MovementHistoryKind,
  MovementHistorySummary,
} from "../../screens/studentMonitoring/studentMonitoringScreen.types";

// dot color for each kind of entry, fixed colors so they stay readable on any background
const DOT_COLOR: Record<MovementHistoryKind, string> = {
  joined: "#6B7280", 
  question_navigated: "#2563EB", 
  focus_lost: "#D97706",
  focus_gained: "#16A34A", 
  submitted: "#1E40AF", 
  timed_out: "#5B21B6", 
  removed: "#DC2626", 
};

// "41s" or "2m 05s"
function formatAway(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
}

// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th"
function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// the one-line recap above the timeline
function summaryText(summary: MovementHistorySummary): string {
  return `Left the window ${summary.windowLeftCount} time${summary.windowLeftCount === 1 ? "" : "s"}, away ${formatAway(summary.totalAwaySeconds)} in total, changed question ${summary.questionChanges} time${summary.questionChanges === 1 ? "" : "s"}.`;
}

// the overlay showing what one student did during each of their attempts
export function MovementHistoryModal({
  classExamId,
  studentId,
  studentName,
  onClose,
}: {
  classExamId: string | null; 
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}) {
  const attemptsState = useStudentAttempts(classExamId, studentId); // all attempts, oldest first
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null); // null means "show the latest attempt"
  const { attempts } = attemptsState;
  const latestSessionId = attempts.length > 0 ? attempts[attempts.length - 1].sessionId : null; // the highest attempt number
  const activeSessionId = pickedSessionId ?? latestSessionId; // the latest opens first, a click overrides it
  const history = useMovementHistory(activeSessionId); // timeline of the attempt on screen

  if (studentId === null) return null; // render nothing when no student is selected

  const isRefreshing = attemptsState.isLoading || history.isLoading;
  const error = attemptsState.error ?? history.error; // show whichever failed first

  // reloads the attempt list too, so a brand new attempt shows up without closing the modal
  const handleRefresh = () => {
    void attemptsState.refetch();
    void history.refetch();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }} // dims the page behind the modal
      onClick={onClose} // click outside the card closes it
    >
      <div
        className="rounded-2xl border w-[680px] max-w-[92vw] max-h-[80vh] overflow-y-auto p-6 bg-[var(--color-base-100)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        onClick={(event) => event.stopPropagation()} // stops the outside click from firing
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-[16px] font-bold">Movement History</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-[13px] font-medium cursor-pointer border-none bg-transparent opacity-70 hover:opacity-100 disabled:opacity-40"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={onClose}
              className="text-[13px] font-medium cursor-pointer border-none bg-transparent opacity-60 hover:opacity-100"
            >
              Close
            </button>
          </div>
        </div>
        <p className="text-[13px] opacity-70 mb-4">{studentName}</p>

        {/* attempt picker: the latest attempt is selected first, a click switches the history below */}
        {attempts.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60 mb-2">Attempt</p>
            <div className="flex flex-wrap gap-2">
              {attempts.map((attempt) => {
                const isActive = attempt.sessionId === activeSessionId; // the attempt on screen
                return (
                  <button
                    key={attempt.sessionId}
                    onClick={() => setPickedSessionId(attempt.sessionId)} // show that attempt's history
                    aria-pressed={isActive}
                    className={`px-3 py-1.5 rounded-lg border text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-80 ${
                      isActive
                        ? "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-content)]" // filled for the active one
                        : "border-[var(--color-base-300)] bg-[var(--color-base-100)] text-[var(--color-base-content)]" // outlined for the others
                    }`}
                  >
                    {ordinal(attempt.attemptNumber)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!error && history.entries.length > 0 && (
          <p className="text-[12px] opacity-70 mb-4">{summaryText(history.summary)}</p>
        )}

        {isRefreshing && history.entries.length === 0 && <p className="text-[13px] opacity-60">Loading history...</p>}

        {error && (
          <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!isRefreshing && !error && activeSessionId === null && (
          <p className="text-[13px] opacity-60">This student has no attempts yet.</p>
        )}

        {!isRefreshing && !error && activeSessionId !== null && history.entries.length === 0 && (
          <p className="text-[13px] opacity-60">No activity has been recorded for this attempt.</p>
        )}

        {history.entries.length > 0 && (
          <ul className="flex flex-col">
            {history.entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-2 border-t border-[var(--color-base-300)] first:border-t-0">
                <span
                  className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DOT_COLOR[entry.kind] }} // colored dot by kind
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]">{entry.label}</p>
                  {entry.detail && <p className="text-[12px] opacity-60">{entry.detail}</p>}
                </div>
                <span className="text-[12px] opacity-60 flex-shrink-0">
                  {new Date(entry.happenedAt).toLocaleTimeString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        )}

        {history.isTruncated && (
          <p className="text-[12px] opacity-60 mt-3">Showing the newest 500 events only.</p>
        )}
      </div>
    </div>
  );
}