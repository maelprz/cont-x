import { supabase } from "./supabaseClient";
import type { AuditLogEntry, AuditActionType } from "../screens/auditLogs/auditLogsScreen.types";

// shape of the data needed to write one new log row
export interface CreateAuditLogPayload {
  adminId: string;         // id of the admin performing the action
  adminName: string;       // name of the admin performing the action
  actionType: AuditActionType; // what kind of action happened
  targetUserId: string | null; // id of the affected user, null if not applicable
  targetName: string;      // name of the affected user
  targetRole: string;      // role of the affected user
  details: string;         // human readable description
}

// writes one audit log row after an admin action succeeds
export async function logAdminAction(payload: CreateAuditLogPayload): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    admin_id: payload.adminId,
    admin_name: payload.adminName,
    action_type: payload.actionType,
    target_user_id: payload.targetUserId,
    target_name: payload.targetName,
    target_role: payload.targetRole,
    details: payload.details,
  });

  // logging failures should not crash the admin's actual action
  // so we surface it in the console instead of throwing
  if (error) {
    console.error("Failed to write audit log:", error.message);
  }
}

// fetches every audit log row, newest first
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, admin_name, action_type, target_name, target_role, details, performed_at")
    .order("performed_at", { ascending: false });

  if (error) throw new Error(error.message);

  // convert snake_case database rows into the camelCase shape the screen expects
  return (data ?? []).map((row) => ({
    id: row.id,
    adminName: row.admin_name,
    actionType: row.action_type as AuditActionType,
    targetName: row.target_name,
    targetRole: row.target_role,
    details: row.details,
    performedAt: row.performed_at,
  }));
}