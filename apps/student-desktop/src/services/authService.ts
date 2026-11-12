import { supabase } from "./supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js"; // lets us read the real error message from an edge function

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
  mustChangePassword: boolean; // true while the account still has to choose its own password
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
  const { data: loginEmail, error: lookupError } = await supabase // ask the database function for the email
    .rpc("get_login_email", { p_id_number: idNumber }); // pass the ID number the student typed
  if (lookupError || !loginEmail) { // no match, or the call failed
    throw new Error("Invalid student ID or password."); // one vague message for every failure
  }

  // Step 2 — authenticate with Supabase Auth using the email we found.
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

  if (authError) {
    throw new Error("Invalid student ID or password."); // same vague message
  }

  // Step 3 — fetch the full profile now that we're authenticated.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number, must_change_password") // new column added at the end so the flag comes back with the profile
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
    mustChangePassword: userData.must_change_password === true, // anything other than true counts as false, so a missing value never traps someone
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
    .select("id, first_name, last_name, email, role, id_number, must_change_password") // new column added at the end so the flag comes back with the profile
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
    mustChangePassword: userData.must_change_password === true, // anything other than true counts as false, so a missing value never traps someone
  };
}

// pulls the real message out of an edge function error, falling back to a generic one
async function readFunctionError(error: unknown): Promise<string> { // same idea as in teacher-web
  if (error instanceof FunctionsHttpError) { // the function replied with an error status
    try { // reading the body can fail, so guard it
      const body = await error.context.json(); // the JSON our function sent back, such as { error: "..." }
      if (body?.error) return String(body.error); // use our own message when there is one
    } catch { /* ignore and fall through */ } // body was not JSON, so keep going
  } // end of the status check
  return error instanceof Error ? error.message : "Request failed."; // generic fallback
} // end of readFunctionError

// sends the new password to the server, which changes it and clears the flag
export async function completePasswordChange(newPassword: string): Promise<void> { // used by the first-login modal
  const { data, error } = await supabase.functions.invoke("complete-password-change", { // the same function teacher-web uses
    body: { newPassword }, // only the new password; the account comes from the login token
  }); // end of the call
  if (error) throw new Error(await readFunctionError(error)); // show the server's own message, for example "too weak"
  if (data?.error) throw new Error(data.error); // a 200 reply that still carries an error
} // end of completePasswordChange