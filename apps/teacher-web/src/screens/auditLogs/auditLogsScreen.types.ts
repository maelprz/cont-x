// Defines the shape of data the Audit Logs screen needs.

// the type of action an admin can perform on an account
export type AuditActionType =
  | "create"
  | "update"
  | "delete"
  | "disable"
  | "enable"
  | "reset_password"
  | "enroll";

// one row in the audit log table
export interface AuditLogEntry {
  id: string;
  adminName: string; // name of the admin who performed the action
  actionType: AuditActionType;
  targetName: string; // name of the user the action was performed on
  targetRole: string; // role of the target user e.g. "teacher" or "student"
  details: string; // human-readable description of what changed
  performedAt: string; // ISO timestamp string
}

export interface AuditLogsScreenProps {
  logs?: AuditLogEntry[];
}
