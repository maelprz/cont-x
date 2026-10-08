import { supabase } from "./supabaseClient"; // the only import this file needs

export interface AuthUser { // the logged-in user's details
  id: string; // account id
  firstName: string; // first name
  lastName: string; // last name
  fullName: string; // first and last name together
  email: string; // login email
  role: "teacher" | "admin" | "superadmin"; // base role, now allowing the future superadmin
  idNumber: string; // school ID number
} // end of AuthUser

export async function login(
  idNumber: string,
  password: string,
): Promise<AuthUser> {
  // Step 1 — find email by id_number.
  // Unauthenticated query — allowed by the RLS policy:
  // "public can look up email by id_number"
  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .select("email")
    .eq("id_number", idNumber)
    .in("role", ["teacher", "admin"]) // only teachers and admins use the web portal
    .single();

  if (profileError || !profileData) {
    throw new Error("Invalid ID number or password."); // vague on purpose
  }

  // Step 2 — authenticate with Supabase Auth using the email we found.
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: profileData.email,
      password,
    });

  if (authError) {
    throw new Error("Invalid ID number or password."); // same vague message
  }

  // Step 3 — fetch full profile now that we're authenticated.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number")
    .eq("id", authData.user.id)
    .single();

  if (userError || !userData) {
    throw new Error(
      "Account authenticated but no user profile found. Contact your administrator.",
    );
  }

  // Step 4 — block students from logging in via the web portal.
  if (userData.role === "student") {
    await supabase.auth.signOut();
    throw new Error(
      "Students should use the desktop application, not this web portal.",
    );
  }

  return {
    id: userData.id,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: `${userData.first_name} ${userData.last_name}`,
    email: userData.email,
    role: userData.role as "teacher" | "admin" | "superadmin",
    idNumber: userData.id_number,
  };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data: userData, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !userData || userData.role === "student") return null;

  return {
    id: userData.id,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: `${userData.first_name} ${userData.last_name}`,
    email: userData.email,
    role: userData.role as "teacher" | "admin" | "superadmin",
    idNumber: userData.id_number,
  };
}
