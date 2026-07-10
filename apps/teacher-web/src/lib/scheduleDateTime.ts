// Converts a Supabase timestamp (or null) into the value a <input type="datetime-local"> expects.
export function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local has no timezone — this renders the browser's local wall-clock time
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Converts a <input type="datetime-local"> value back into a real ISO timestamp, or null if empty.
export function localInputValueToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}