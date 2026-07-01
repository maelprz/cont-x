import { supabase } from "./supabaseClient";

// Shape of a logged-in student.
// Desktop app only ever authenticates students —
// teachers and admins are blocked at Step 3.
export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string; // derived — used in AppHeader and Dashboard welcome message
  email: string;
  role: "student"; // narrowed — desktop app never logs in other roles
  idNumber: string;
}

// Logs in using the student's ID number + password.
// Supabase Auth requires an email, so Step 1 looks up
// the email that belongs to this id_number first.
export async function login(
  idNumber: string,
  password: string,
): Promise<AuthUser> {
  // Step 1 — find email by id_number.
  // Unauthenticated query — allowed by the RLS policy:
  // "public can look up student email by id_number"
  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .select("email")
    .eq("id_number", idNumber) // matches what the student typed
    .eq("role", "student") // guards against teachers/admins using the desktop app
    .single();

  if (profileError || !profileData) {
    // Deliberately vague — don't reveal whether the ID exists
    throw new Error("Invalid student ID or password.");
  }

  // Step 2 — authenticate with Supabase Auth using the email we found.
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: profileData.email,
      password,
    });

  if (authError) {
    throw new Error("Invalid student ID or password."); // same vague message
  }

  // Step 3 — fetch the full profile now that we're authenticated.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number")
    .eq("id", authData.user.id)
    .single();

  if (userError || !userData) {
    throw new Error(
      "Account authenticated but no student profile found. Contact your administrator.",
    );
  }

  // Step 4 — confirm this is a student account.
  // Redundant with the Step 1 filter but worth double-checking
  // in case data integrity is ever off.
  if (userData.role !== "student") {
    await supabase.auth.signOut(); // clear the session immediately
    throw new Error(
      "This application is for students only. " +
        "Teachers and admins should use the web portal.",
    );
  }

  return {
    id: userData.id,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: `${userData.first_name} ${userData.last_name}`,
    email: userData.email,
    role: "student",
    idNumber: userData.id_number,
  };
}

// Logs out the current student, clearing their Supabase session.
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// Checks for an existing session when the app first loads.
// Stops a logged-in student from being kicked to login on app restart.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data: userData, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !userData || userData.role !== "student") return null;

  return {
    id: userData.id,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: `${userData.first_name} ${userData.last_name}`,
    email: userData.email,
    role: "student",
    idNumber: userData.id_number,
  };
}
