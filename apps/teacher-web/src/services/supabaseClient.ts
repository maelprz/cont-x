import { createClient } from "@supabase/supabase-js"; // Supabase's JS client library

// Reads the project URL and anon key from the .env file.
// VITE_ prefix is required — Vite silently ignores variables without it.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Guards against a missing .env file — fails loudly at startup
// instead of silently failing later when a real API call is made.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Check that apps/teacher-web/.env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// The single shared Supabase client for the entire teacher-web app.
// Every service file imports THIS instance — never creates its own.
// Uses the anon key only — safe to use in the browser since RLS
// controls what this key is actually allowed to read or write.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
