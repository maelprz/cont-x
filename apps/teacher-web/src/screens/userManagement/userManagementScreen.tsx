import { useState } from "react";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import type { UserManagementScreenProps, UserDirectoryEntry } from "./userManagementScreen.types";
import { AdminHeader } from "../../components/layouts/adminHeader";
import { AdminSidebar } from "../../components/layouts/adminSidebar";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------
const MOCK_USERS: UserDirectoryEntry[] = [
  { id: "1", name: "Dr. Aris Thorne", systemId: "T-48293", email: "a.thorne@contx.edu", role: "teacher", createdDate: "2023-10-12" },
  { id: "2", name: "Elias Miller", systemId: "S-99218", email: "e.miller_24@student.contx.edu", role: "student", createdDate: "2024-01-05" },
  { id: "3", name: "Sarah Kinsley", systemId: "T-48295", email: "s.kinsley@contx.edu", role: "teacher", createdDate: "2023-11-30" },
];

const roleBadgeStyle: Record<UserDirectoryEntry["role"], string> = {
  teacher: "bg-[var(--color-accent)] text-[var(--color-accent-content)]",
  student: "bg-[var(--color-secondary)] text-[var(--color-secondary-content)]",
};

export function UserManagementScreen({
  totalTeachers = 84,
  totalStudents = 1152,
  users = MOCK_USERS,
  onAddAccount,
}: UserManagementScreenProps) {
  // holds whatever the admin types into the header's search box
  const [searchQuery, setSearchQuery] = useState("");

  // narrows the user list down to whatever matches the search box
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.systemId}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">

      <AdminSidebar activeItem="userManagement" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader searchValue={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto px-8 py-6">

          <p className="text-xs opacity-60 mb-2">
            Core System &nbsp;&gt;&nbsp; Account Management
          </p>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">User Directory</h1>
              <p className="text-sm opacity-70 max-w-xl">
                System-wide registry for administrative and academic credentials.
                Secure lifecycle management of student, teacher, and staff
                identities within the Cont/x network.
              </p>
            </div>
            <button
              onClick={onAddAccount}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-primary-content)] rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 shrink-0"
            >
              <UserPlus size={16} />
              Add Account
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Total Teachers</p>
              <p className="text-2xl font-bold">{totalTeachers}</p>
            </div>
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Total Students</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </div>

          <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wide opacity-60 bg-[var(--color-base-200)]">
                  <th className="text-left py-3 px-5 font-medium">User Identity</th>
                  <th className="text-left py-3 px-5 font-medium">Credential Endpoint</th>
                  <th className="text-left py-3 px-5 font-medium">Security Group</th>
                  <th className="text-left py-3 px-5 font-medium">Created</th>
                  <th className="text-left py-3 px-5 font-medium">Ops</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-[var(--color-base-200)] ${
                      index < filteredUsers.length - 1 ? "border-b border-[var(--color-base-300)]" : ""
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs opacity-60">{user.systemId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-sm">{user.email}</td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full ${roleBadgeStyle[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-sm opacity-70">{user.createdDate}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-full hover:bg-[var(--color-base-200)]">
                          <Pencil size={13} />
                        </button>
                        <button className="p-1.5 rounded-full hover:bg-[var(--color-error)]/10 text-[var(--color-error)]">
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