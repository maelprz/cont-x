export const OVERTIME_GRACE_SECONDS = 15;

export function computeOvertimeSeconds(
  joinedAt: string | null,
  submittedAt: string | null,
  durationMinutes: number,
): number {
  if (!joinedAt || !submittedAt || durationMinutes <= 0) return 0;

  const joined = Date.parse(joinedAt);
  const submitted = Date.parse(submittedAt);
  if (Number.isNaN(joined) || Number.isNaN(submitted)) return 0;

  const overBySeconds = (submitted - joined) / 1000 - durationMinutes * 60;
  return overBySeconds > OVERTIME_GRACE_SECONDS ? Math.round(overBySeconds) : 0;
}

// "+3:05 over", for the results table
export function formatOvertime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `+${minutes}:${String(rest).padStart(2, "0")} over`;
}