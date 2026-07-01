import { supabase } from "./supabaseClient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  idNumber: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password }); //Verifies is password matches

  if (authError) {
    throw new Error(authError.message);
  }

  const authUserId = authData.user.id;

  //fetch data from the users table to get the role.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, name, email, role, id_number")
    .eq("id", authUserId)
    .single();

  if (userError || !userData) {
    throw new Error("Account authenticated but no user profile found.");
  }

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role as AuthUser["role"],
    idNumber: userData.id_number,
  };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

//checks it theres already a session when the app first loads
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession(); //reads from localStorage
  if (!sessionData.session) return null; //no active session, user needs to log in

  const authUserId = sessionData.session.user.id;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, name, email, role, id_number")
    .eq("id", authUserId)
    .single();

  if (userError || !userData) return null; // session exists but profile missing — treat as logged out

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role as AuthUser["role"],
    idNumber: userData.id_number,
  };
}
