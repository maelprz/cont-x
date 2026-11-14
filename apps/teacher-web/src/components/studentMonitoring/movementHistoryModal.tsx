import { useMovementHistory } from "../../hooks/useMovementHistory"; 
import type {
  MovementHistoryKind,
  MovementHistorySummary,
} from "../../screens/studentMonitoring/studentMonitoringScreen.types";

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

// the one-line recap above the timeline
function summaryText(summary: MovementHistorySummary): string {
  return `Left the window ${summary.windowLeftCount} time${summary.windowLeftCount === 1 ? "" : "s"}, away ${formatAway(summary.totalAwaySeconds)} in total, changed question ${summary.questionChanges} time${summary.questionChanges === 1 ? "" : "s"}.`;
}

// the overlay showing what one student did during their attempt
export function MovementHistoryModal({
  sessionId,
  studentName,
  onClose,
}: {
  sessionId: string | null; // null means closed
  studentName: string;
  onClose: () => void;
}) {
  const { entries, summary, isTruncated, isLoading, error, refetch } = useMovementHistory(sessionId);

  if (sessionId === null) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }} 
      onClick={onClose} 
    >
      <div
        className="rounded-2xl border w-[560px] max-h-[75vh] overflow-y-auto p-6 bg-[var(--color-base-100)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-[16px] font-bold">Movement History</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void refetch()}
              disabled={isLoading}
              className="text-[13px] font-medium cursor-pointer border-none bg-transparent opacity-70 hover:opacity-100 disabled:opacity-40"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
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

        {!error && entries.length > 0 && <p className="text-[12px] opacity-70 mb-4">{summaryText(summary)}</p>}

        {isLoading && entries.length === 0 && <p className="text-[13px] opacity-60">Loading history...</p>}

        {error && (
          <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <p className="text-[13px] opacity-60">No activity has been recorded for this attempt.</p>
        )}

        {entries.length > 0 && (
          <ul className="flex flex-col">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-2 border-t border-[var(--color-base-300)] first:border-t-0">
                <span
                  className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DOT_COLOR[entry.kind] }}
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

        {isTruncated && (
          <p className="text-[12px] opacity-60 mt-3">Showing the newest 500 events only.</p>
        )}
      </div>
    </div>
  );
}