import { useState } from "react"; // tracks the search input text
import type { ChangeEvent } from "react";
import { UserPlus, Search, Shield, Bell, Pencil, Trash2 } from "lucide-react";
import type { UserManagementScreenProps, UserDirectoryEntry } from "./userManagementScreen.types";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------
const MOCK_USERS: UserDirectoryEntry[] = [
  { id: "1", name: "Dr. Aris Thorne", initials: "DA", systemId: "T-48293", email: "a.thorne@contx.edu", role: "teacher", createdDate: "2023-10-12" },
  { id: "2", name: "Elias Miller", initials: "EM", systemId: "S-99218", email: "e.miller_24@student.contx.edu", role: "student", createdDate: "2024-01-05" },
  { id: "3", name: "Sarah Kinsley", initials: "SK", systemId: "T-48295", email: "s.kinsley@contx.edu", role: "teacher", createdDate: "2023-11-30" },
];

// badge colors per role, mapped to daisyui semantic classes from the theme
const roleBadgeClass: Record<UserDirectoryEntry["role"], string> = {
  teacher: "badge-primary",
  student: "badge-info",
};

export function UserManagementScreen({
  totalTeachers = 84,
  totalStudents = 1152,
  users = MOCK_USERS,
  onAddAccount,
}: UserManagementScreenProps) {
  // holds whatever the admin types into the filter box
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
  }

  // narrows the user list down to whatever matches the search box
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.systemId}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    // flex layout: sidebar fixed-width, content fills the rest
    <div className="flex h-screen bg-base-200">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-primary flex flex-col shrink-0">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary-content" />
            <span className="text-primary-content font-bold text-lg">Cont/x</span>
          </div>
          <p className="text-primary-content/70 text-xs uppercase tracking-wide mt-1">
            Secure Ecosystem
          </p>
        </div>

        <nav className="px-4 flex flex-col gap-1">
          <p className="text-primary-content/60 text-[10px] uppercase tracking-wider px-2 mb-1">
            Main Menu
          </p>
          {/* active nav item — filled to match the screenshot's highlighted state */}
          <button className="flex items-center gap-2.5 bg-primary-content/15 text-primary-content rounded-lg px-3 py-2 text-sm font-medium text-left">
            User Management
          </button>

          <p className="text-primary-content/60 text-[10px] uppercase tracking-wider px-2 mt-4 mb-1">
            Configuration
          </p>
          <button className="flex items-center gap-2.5 text-primary-content/80 hover:bg-primary-content/10 rounded-lg px-3 py-2 text-sm text-left">
            Audit Logs
          </button>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* top bar: search + admin identity */}
        <header className="bg-base-100 border-b border-base-300 px-8 py-3 flex items-center justify-between gap-4">
          <label className="input input-bordered flex items-center gap-2 w-full max-w-md">
            <Search size={15} className="opacity-50" />
            <input
              type="text"
              placeholder="Search accounts, roles, IDs..."
              className="grow"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </label>

          <div className="flex items-center gap-4 shrink-0">
            <button className="btn btn-ghost btn-circle btn-sm">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">Admin Root</p>
                <p className="text-xs opacity-60 leading-tight">Supervisor</p>
              </div>
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">AR</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* scrollable body */}
        <main className="flex-1 overflow-y-auto px-8 py-6">

          {/* breadcrumb */}
          <p className="text-xs opacity-60 mb-2">
            Core System &nbsp;&gt;&nbsp; Account Management
          </p>

          {/* heading row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">User Directory</h1>
              <p className="text-sm opacity-70 max-w-xl">
                System-wide registry for administrative and academic credentials.
                Secure lifecycle management of student, teacher, and staff
                identities within the Cont/x network.
              </p>
            </div>
            <button onClick={onAddAccount} className="btn btn-primary gap-2 shrink-0">
              <UserPlus size={16} />
              Add Account
            </button>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
            <div className="bg-base-100 border border-base-300 rounded-box p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Total Teachers</p>
              <p className="text-2xl font-bold">{totalTeachers}</p>
            </div>
            <div className="bg-base-100 border border-base-300 rounded-box p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Total Students</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </div>

          {/* table card */}
          <div className="bg-base-100 border border-base-300 rounded-box overflow-hidden">
            <table className="table">
              <thead>
                <tr className="text-xs uppercase tracking-wide opacity-60">
                  <th>User Identity</th>
                  <th>Credential Endpoint</th>
                  <th>Security Group</th>
                  <th>Created</th>
                  <th>Ops</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div
                            className={`rounded-lg w-8 ${
                              user.role === "teacher" ? "bg-primary text-primary-content" : "bg-info text-info-content"
                            }`}
                          >
                            <span className="text-xs">{user.initials}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs opacity-60">{user.systemId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{user.email}</td>
                    <td>
                      <span className={`badge ${roleBadgeClass[user.role]} badge-sm uppercase`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-sm opacity-70">{user.createdDate}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-xs btn-circle">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-ghost btn-xs btn-circle text-error">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <p className="text-center text-sm opacity-60 py-8">
                No accounts match that search.
              </p>
            )}
          </div>

          <p className="text-xs opacity-50 mt-3">
            Listing {filteredUsers.length} of {users.length} records
          </p>
        </main>
      </div>
    </div>
  );
}