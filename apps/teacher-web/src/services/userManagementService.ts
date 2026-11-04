import { supabase } from "./supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "teacher" | "student" | "admin" | "superadmin";
  id_number: string;
  created_at: string;
  has_admin_grant: boolean;
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

// pulls the real message out of an edge function error, falling back to a generic one
async function readFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    // the function replied with an error status
    try {
      // reading the body can fail, so guard it
      const body = await error.context.json(); // the JSON our function sent back, such as { error: "..." }
      if (body?.error) return String(body.error); // use our own message when there is one
    } catch {
      /* ignore and fall through to the generic message */
    } // body was not JSON, so keep going
  }
  return error instanceof Error ? error.message : "Request failed.";
}

// fetches every user plus their admin grants, newest first
export async function getAllUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, id_number, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: grants, error: grantsError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (grantsError) throw new Error(grantsError.message);

  const grantedIds = new Set((grants ?? []).map((g) => g.user_id));
  return (data ?? []).map((u) => ({
    ...u,
    has_admin_grant: grantedIds.has(u.id),
  })) as UserRecord[];
}

// calls the create-user edge function and returns the new account's id
export async function createUser(
  payload: CreateUserPayload,
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: payload,
  });
  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
  return data?.userId ?? null;
}

// updates allowed fields on an existing user row
export async function updateUser(
  userId: string,
  payload: UpdateUserPayload,
): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Update was not applied. You may not have permission to edit this account.",
    );
  }
}

// calls the delete-user edge function, which checks rank on the server
export async function deleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });
  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
}

// grants (true) or revokes (false) the admin role for a teacher
export async function setUserAdmin(
  userId: string,
  grant: boolean,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("set-user-admin", {
    body: { userId, grant },
  });
  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
}

export type BulkRole = "teacher" | "student";

export type BulkRoleOutcome =
  | "created"
  | "email_taken"
  | "id_taken"
  | "invalid"
  | "duplicate_in_file"
  | "error";

export interface BulkAccountRow {
  first_name: string;
  last_name: string;
  email: string;
  id_number: string;
}

export interface BulkRowResult {
  index: number; // row index in the CSV file
  outcome: BulkRoleOutcome;
  reason?: string;
}

export interface BulkCreateResult {
  role: BulkRole;
  summary: Record<BulkRoleOutcome, number>; // counts of each outcome
  results: BulkRowResult[]; // one result per row in the CSV file
  stopped_early: boolean; // true if the function stopped processing before reaching the end of the file
  audit_logged: boolean; // true if the function logged the results to the audit log
}

export async function createUsersBulk(
  role: BulkRole,
  accounts: BulkAccountRow[],
): Promise<BulkCreateResult> {
  const { data, error } = await supabase.functions.invoke("create-user-bulk", {
    body: { role, accounts },
  });

  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
  // guards against a deploy mix-up where a different function answers with an unexpected shape
  if (!data?.summary || !Array.isArray(data?.results)) {
    throw new Error("Unexpected response from the server.");
  }
  return data as BulkCreateResult;
}
