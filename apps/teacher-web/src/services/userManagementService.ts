import { supabase } from "./supabaseClient";

// shape of a user row coming back from the database
export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "teacher" | "student";
  id_number: string;
  created_at: string;
}

// shape of the data needed to create a new user account
export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "teacher" | "student";
  id_number: string;
}

// shape of the data allowed when updating an existing user
export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: "teacher" | "student";
  id_number?: string;
}

// fetches every user from the users table, newest first
export async function getAllUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// calls the create-user edge function which runs with the service role key server-side
export async function createUser(payload: CreateUserPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: payload,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// updates allowed fields on an existing user row
export async function updateUser(
  userId: string,
  payload: UpdateUserPayload
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

// calls the delete-user edge function which runs with the service role key server-side
export async function deleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}