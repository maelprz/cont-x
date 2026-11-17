import { createClient } from "@supabase/supabase-js"; // Supabase's JS client library

// Reads from apps/student-desktop/.env — same project URL as teacher-web,
// since both apps share the same Supabase database.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Fails loudly at startup rather than silently on the first real API call.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Check that apps/student-desktop/.env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// Single shared client for the entire renderer — every service file imports this,
// never creates its own instance.
// Keep the SDK's project-scoped storage key so offline startup can identify the cached owner.
const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: authStorageKey },
});

export function getCachedSessionOwner(): string | null {
  try {
    const id: unknown = JSON.parse(localStorage.getItem(authStorageKey) ?? "null")?.user?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
