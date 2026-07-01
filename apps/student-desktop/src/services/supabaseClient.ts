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
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
