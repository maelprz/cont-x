import { supabase } from "./supabaseClient";

export interface AuthUser {
  id: string;
  firstName: string; // matches first_name column
  lastName: string; // matches last_name column
  email: string;
  role: "student" | "teacher" | "admin";
  idNumber: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError) throw new Error(authError.message);

  const authUserId = authData.user.id;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number") // fixed columns
    .eq("id", authUserId)
    .single();

  if (userError || !userData) {
    throw new Error("Account authenticated but no user profile found.");
  }

  return {
    id: userData.id,
    firstName: userData.first_name, // mapped correctly
    lastName: userData.last_name, // mapped correctly
    email: userData.email,
    role: userData.role as AuthUser["role"],
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

  const authUserId = sessionData.session.user.id;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number") // fixed columns
    .eq("id", authUserId)
    .single();

  if (userError || !userData) return null;

  return {
    id: userData.id,
    firstName: userData.first_name, // mapped correctly
    lastName: userData.last_name, // mapped correctly
    email: userData.email,
    role: userData.role as AuthUser["role"],
    idNumber: userData.id_number,
  };
}
