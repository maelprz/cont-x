import { useState } from "react";
import type { ChangeEvent } from "react";
import { AdminHeader } from "../../components/layoutAdmin/adminHeader";
import { AdminSidebar } from "../../components/layoutAdmin/adminSidebar";
import type { AuditLogsScreenProps, AuditLogEntry, AuditActionType } from "./auditLogsScreen.types";

// ---------------------------------------------------------------------------
// Mock data -- replace with real Supabase query from admin_account_actions when wiring up
// ---------------------------------------------------------------------------
const MOCK_LOGS: AuditLogEntry[] = [
  {
    id: "1",
    adminName: "Admin Root",
    actionType: "create",
    targetName: "Mel Perez",
    targetRole: "teacher",
    details: "Created teacher account with email maelprz@gmail.com",
    performedAt: "2026-07-01T06:21:12Z",
  },
  {
    id: "2",
    adminName: "Admin Root",
    actionType: "update",
    targetName: "Juan dela Cruz",
    targetRole: "student",
    details: "Updated last name from dela Cruz to Santos",
    performedAt: "2026-07-01T07:45:00Z",
  },
  {
    id: "3",
    adminName: "Admin Root",
    actionType: "delete",
    targetName: "Sarah Kinsley",
    targetRole: "teacher",
    details: "Deleted teacher account with email s.kinsley@contx.edu",
    performedAt: "2026-07-01T08:10:33Z",
  },
  {
    id: "4",
    adminName: "Admin Root",
    actionType: "reset_password",
    targetName: "Elias Miller",
    targetRole: "student",
    details: "Issued password reset for e.miller_24@student.contx.edu",
    performedAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "5",
    adminName: "Admin Root",
    actionType: "disable",
    targetName: "Dr. Aris Thorne",
    targetRole: "teacher",
    details: "Disabled account pending academic integrity review",
    performedAt: "2026-07-01T10:15:44Z",
  },
];

// badge style per action type
const actionBadgeStyle: Record<AuditActionType, string> = {
  create:         "bg-[var(--color-success)]/20 text-[var(--color-success-content)]",
  update:         "bg-[var(--color-primary)]/20 text-[var(--color-primary-content)]",
  delete:         "bg-[var(--color-error)]/15 text-[var(--color-error)]",
  disable:        "bg-[var(--color-warning)]/20 text-[var(--color-warning-content)]",
  enable:         "bg-[var(--color-info)]/15 text-[var(--color-info-content)]",
  reset_password: "bg-[var(--color-base-300)] text-[var(--color-base-content)]",
};

// human-readable label per action type
const actionLabel: Record<AuditActionType, string> = {
  create:         "Created",
  update:         "Updated",
  delete:         "Deleted",
  disable:        "Disabled",
  enable:         "Enabled",
  reset_password: "Reset Password",
};

// formats an ISO timestamp to a readable string e.g. "2026-07-01 06:21"
function formatTimestamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function AuditLogsScreen({ logs = MOCK_LOGS }: AuditLogsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // filter dropdown: which action type to show
  const [actionFilter, setActionFilter] = useState<AuditActionType | "all">("all");

  function handleSearchChange(value: string) {
    setSearchQuery(value);
  }

  function handleActionFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    setActionFilter(event.target.value as AuditActionType | "all");
  }

  // narrows the list to rows matching search and action filter
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = `${log.adminName} ${log.targetName} ${log.details}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesFilter =
      actionFilter === "all" || log.actionType === actionFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <AdminSidebar activeItem="auditLogs" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader searchValue={searchQuery} onSearchChange={handleSearchChange} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-xs opacity-60 mb-2">
            Core System &gt; Audit Logs
          </p>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Audit Logs</h1>
              <p className="text-sm opacity-70 max-w-xl">
                A full record of all administrative actions performed on user
                accounts. Every create, update, delete, and access change is
                logged here for accountability and review.
              </p>
            </div>

            {/* action type filter dropdown */}
            <select
              value={actionFilter}
              onChange={handleActionFilterChange}
              className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-100)] shrink-0"
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
              <option value="disable">Disabled</option>
              <option value="enable">Enabled</option>
              <option value="reset_password">Reset Password</option>
            </select>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Total Actions</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Accounts Created</p>
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.actionType === "create").length}
              </p>
            </div>
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Accounts Deleted</p>
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.actionType === "delete").length}
              </p>
            </div>
          </div>

          {/* log table */}
          <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wide opacity-60 bg-[var(--color-base-200)]">
                  <th className="text-left py-3 px-5 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-5 font-medium">Admin</th>
                  <th className="text-left py-3 px-5 font-medium">Action</th>
                  <th className="text-left py-3 px-5 font-medium">Target Account</th>
                  <th className="text-left py-3 px-5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-[var(--color-base-200)] ${
                      index < filteredLogs.length - 1
                        ? "border-b border-[var(--color-base-300)]"
                        : ""
                    }`}
                  >
                    {/* timestamp */}
                    <td className="py-3.5 px-5 text-sm font-mono opacity-70 whitespace-nowrap">
                      {formatTimestamp(log.performedAt)}
                    </td>

                    {/* admin who performed the action */}
                    <td className="py-3.5 px-5 text-sm font-medium">
                      {log.adminName}
                    </td>

                    {/* action badge */}
                    <td className="py-3.5 px-5">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full ${actionBadgeStyle[log.actionType]}`}
                      >
                        {actionLabel[log.actionType]}
                      </span>
                    </td>

                    {/* target user */}
                    <td className="py-3.5 px-5">
                      <p className="text-sm font-medium">{log.targetName}</p>
                      <p className="text-xs opacity-60 capitalize">{log.targetRole}</p>
                    </td>

                    {/* details */}
                    <td className="py-3.5 px-5 text-sm opacity-70 max-w-xs">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <p className="text-center text-sm opacity-60 py-8">
                No log entries match that search.
              </p>
            )}
          </div>

          <p className="text-xs opacity-50 mt-3">
            Showing {filteredLogs.length} of {logs.length} entries
          </p>
        </main>
      </div>
    </div>
  );
}