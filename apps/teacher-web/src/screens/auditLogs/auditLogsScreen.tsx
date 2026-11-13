import { useState } from "react";
import { TeacherSelect } from "../../components/shared/teacherSelect";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "../../components/layoutAdmin/adminHeader";
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar";
import { useAuditLogs } from "../../hooks/useAuditLogs";
import type { AuditActionType } from "./auditLogsScreen.types";

// badge style per action type
const actionBadgeStyle: Record<AuditActionType, string> = {
  create: "bg-[var(--color-success)] text-[var(--color-success-content)]",
  update: "bg-[var(--color-primary)] text-[var(--color-primary-content)]",
  delete: "bg-[var(--color-error)] text-[var(--color-error-content)]",
  disable: "bg-[var(--color-warning)] text-[var(--color-warning-content)]",
  enable: "bg-[var(--color-info)] text-[var(--color-info-content)]",
  reset_password: "bg-[var(--color-base-300)] text-[var(--color-base-content)]",
  enroll: "bg-[var(--color-info)] text-[var(--color-info-content)]",
};

// human readable label per action type
const actionLabel: Record<AuditActionType, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  disable: "Disabled",
  enable: "Enabled",
  reset_password: "Reset Password",
  enroll: "Enrolled",
};

// formats an ISO timestamp to a readable string e.g. "2026-07-01 06:21"
function formatTimestamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function AuditLogsScreen() {
  // pulls real log data, loading state, and error state from Supabase
  const { logs, isLoading, error } = useAuditLogs();

  const [searchQuery, setSearchQuery] = useState("");

  // filter dropdown: which action type to show
  const [actionFilter, setActionFilter] = useState<AuditActionType | "all">(
    "all",
  );

  function handleSearchChange(value: string) {
    setSearchQuery(value);
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
      <AdminAreaSidebar activeItem="auditLogs" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-xs opacity-60 mb-2">Core System &gt; Audit Logs</p>

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
            <TeacherSelect<AuditActionType | "all">
              label="Filter by action"
              value={actionFilter}
              onChange={setActionFilter}
              className="w-44 shrink-0"
              options={[{ value: "all", label: "All Actions" }, ...(Object.keys(actionLabel) as AuditActionType[]).map((value) => ({ value, label: actionLabel[value] }))]}
            />
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
                Total Actions
              </p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
                Accounts Created
              </p>
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.actionType === "create").length}
              </p>
            </div>
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
                Accounts Deleted
              </p>
              <p className="text-2xl font-bold">
                {logs.filter((l) => l.actionType === "delete").length}
              </p>
            </div>
          </div>

          {/* loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm opacity-60 py-8">
              <Loader2 size={16} className="animate-spin" />
              Loading audit logs...
            </div>
          )}

          {/* error state */}
          {error && (
            <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl px-5 py-4 text-sm mb-4">
              {error}
            </div>
          )}

          {/* log table */}
          {!isLoading && !error && (
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wide opacity-60 bg-[var(--color-base-200)]">
                    <th className="text-left py-3 px-5 font-medium">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-5 font-medium">Admin</th>
                    <th className="text-left py-3 px-5 font-medium">Action</th>
                    <th className="text-left py-3 px-5 font-medium">
                      Target Account
                    </th>
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
                        <p className="text-xs opacity-60 capitalize">
                          {log.targetRole}
                        </p>
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
          )}

          <p className="text-xs opacity-50 mt-3">
            Showing {filteredLogs.length} of {logs.length} entries
          </p>
        </main>
      </div>
    </div>
  );
}
