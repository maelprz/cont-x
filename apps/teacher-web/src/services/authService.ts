import { supabase } from "./supabaseClient"; 

export interface AuthUser { 
  id: string;
  firstName: string; 
  lastName: string; 
  fullName: string; 
  email: string; 
  role: "teacher" | "admin" | "superadmin"; 
  idNumber: string; 
  hasAdminGrant: boolean; 
} 

// checks whether this account holds the admin grant, using the user's own row
async function fetchHasAdminGrant(userId: string): Promise<boolean> { 
  const { data } = await supabase 
    .from("user_roles") 
    .select("role") 
    .eq("user_id", userId) 
    .eq("role", "admin") 
    .maybeSingle(); 
  return !!data; 
} 

export async function login(
  idNumber: string,
  password: string,
): Promise<AuthUser> {
  // Step 1 — find email by id_number.
  // Unauthenticated query — allowed by the RLS policy:
  // "public can look up email by id_number"
  const { data: loginEmail, error: lookupError } = await supabase // call the database function instead of reading the table
    .rpc("get_login_email", { p_id_number: idNumber }); // pass the ID number the user typed
  if (lookupError || !loginEmail) { // no match, or the call failed
    throw new Error("Invalid ID number or password."); // same vague message as before, so nothing leaks
  }

  // Step 2 — authenticate with Supabase Auth using the email we found.
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: loginEmail,
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
    hasAdminGrant: await fetchHasAdminGrant(userData.id),
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
    hasAdminGrant: await fetchHasAdminGrant(userData.id),
  };
}
