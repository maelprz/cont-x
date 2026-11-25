import { supabase } from "./supabaseClient"; 
import type {
  MovementHistoryEntry,
  MovementHistorySummary,
} from "../screens/studentMonitoring/studentMonitoringScreen.types";

const MAX_EVENTS = 500; 

// one saved event, as the database returns it
type EventRow = {
  id: string;
  event_type: "question_navigated" | "focus_lost" | "focus_gained" | "submitted";
  occurred_at: string; 
  meta: {
    delay_ms?: number; 
    captured_at?: string;
    position?: number; 
    from_position?: number; 
    to_position?: number; 
  } | null;
};

// the attempt itself, used for the joined / finished entries
type SessionRow = {
  status: "in_progress" | "submitted" | "timed_out" | "removed";
  attempt_number: number;
  joined_at: string;
  submitted_at: string | null;
  removed_at: string | null;
};

export type MovementHistoryResult = {
  entries: MovementHistoryEntry[]; 
  summary: MovementHistorySummary;
  isTruncated: boolean; 
};

// "12s" or "1m 05s"
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

// " (on Q3)" when we know the position, otherwise nothing
function onQuestion(position: number | undefined): string {
  return position ? ` (on Q${position})` : "";
}

// loads one attempt's history: recorded events plus the lifecycle from exam_sessions
export async function getMovementHistory(sessionId: string): Promise<MovementHistoryResult> {
  const [eventsResult, sessionResult] = await Promise.all([
    supabase
      .from("session_movement_events")
      .select("id, event_type, occurred_at, meta", { count: "exact" })
      .eq("session_id", sessionId) // only this attempt
      .order("occurred_at", { ascending: false }) // newest first, so the cap keeps the recent ones
      .order("id", { ascending: false })
      .limit(MAX_EVENTS),
    supabase
      .from("exam_sessions")
      .select("status, attempt_number, joined_at, submitted_at, removed_at")
      .eq("id", sessionId)
      .single(),
  ]);
  if (eventsResult.error) throw new Error(eventsResult.error.message); 
  if (sessionResult.error) throw new Error(sessionResult.error.message);

  const eventRows = (eventsResult.data ?? []) as EventRow[];
  const session = sessionResult.data as SessionRow;
  const joinedAt = Date.parse(session.joined_at);
  const endAt = session.status === "in_progress" ? Date.now()
    : Date.parse((session.status === "removed" ? session.removed_at : session.submitted_at) ?? "");

  // Older clients only send the time spent waiting in the buffer.
  const timed = eventRows
    .filter((row) => row.event_type !== "submitted") 
    .map((row) => {
      const capturedAt = Date.parse(row.meta?.captured_at ?? "");
      return {
        row,
        time: Number.isFinite(capturedAt) ? capturedAt : Date.parse(row.occurred_at) - (row.meta?.delay_ms ?? 0),
      };
    })
    .filter(({ time }) => Number.isFinite(time))
    .map((event) => ({ ...event, time: Math.max(joinedAt, Math.min(event.time, Number.isFinite(endAt) ? endAt : event.time)) }))
    .sort((a, b) => a.time - b.time);

  // 2. walk the events in order to build sentences and work out how long each away period lasted
  const entries: MovementHistoryEntry[] = [];
  let lostAt: number | null = null; 
  let lostEntry: MovementHistoryEntry | null = null;
  let windowLeftCount = 0;
  let totalAwaySeconds = 0;
  let questionChanges = 0;

  for (const { row, time } of timed) {
    const iso = new Date(time).toISOString();
    if (row.event_type === "question_navigated") {
      questionChanges += 1;
      const from = row.meta?.from_position;
      const to = row.meta?.to_position;
      entries.push({
        id: row.id,
        kind: "question_navigated",
        happenedAt: iso,
        label: from && to ? `Moved from Q${from} to Q${to}` : "Changed question",
        detail: null,
      });
    } else if (row.event_type === "focus_lost") {
      windowLeftCount += 1;
      // Duplicate lost events must not reset an already-open interval.
      if (lostAt === null) lostAt = time;
      entries.push({
        id: row.id,
        kind: "focus_lost",
        happenedAt: iso,
        label: `Left the exam window${onQuestion(row.meta?.position)}`,
        detail: null,
      });
      if (lostEntry === null) lostEntry = entries.at(-1) ?? null;
    } else if (row.event_type === "focus_gained") {
      let detail: string | null = null;
      if (lostAt !== null) {
        const away = Math.max(0, Math.round((time - lostAt) / 1000)); 
        totalAwaySeconds += away;
        detail = `Away for ${formatDuration(away)}`;
        lostAt = null; 
        lostEntry = null;
      }
      entries.push({
        id: row.id,
        kind: "focus_gained",
        happenedAt: iso,
        label: `Returned to the exam window${onQuestion(row.meta?.position)}`,
        detail,
      });
    }
  }

  if (lostAt !== null && Number.isFinite(endAt)) {
    const away = Math.max(0, Math.round((endAt - lostAt) / 1000));
    totalAwaySeconds += away;
    if (lostEntry) {
      lostEntry.detail = `Away for ${formatDuration(away)} ${session.status === "in_progress" ? "as of this refresh" : "until the attempt ended"}`;
    }
  }

  // 3. lifecycle entries come from exam_sessions, which the student cannot edit
  entries.push({
    id: "joined",
    kind: "joined",
    happenedAt: new Date(session.joined_at).toISOString(),
    label: "Started the exam",
    detail: `Attempt ${session.attempt_number}`,
  });
  if (session.status === "submitted" && session.submitted_at) {
    entries.push({ id: "finished", kind: "submitted", happenedAt: new Date(session.submitted_at).toISOString(), label: "Submitted the exam", detail: null });
  } else if (session.status === "timed_out" && session.submitted_at) {
    entries.push({ id: "finished", kind: "timed_out", happenedAt: new Date(session.submitted_at).toISOString(), label: "Time ran out, answers were submitted", detail: null });
  } else if (session.status === "removed" && session.removed_at) {
    entries.push({ id: "finished", kind: "removed", happenedAt: new Date(session.removed_at).toISOString(), label: "Removed from the exam by the teacher", detail: null });
  }

  // 4. newest first, which is the most useful order while the exam is live
  entries.sort((a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt));

  return {
    entries,
    summary: { windowLeftCount, totalAwaySeconds, questionChanges },
    isTruncated: eventsResult.count !== null
      ? (eventsResult.count ?? 0) > eventRows.length : eventRows.length >= MAX_EVENTS,
  };
}
