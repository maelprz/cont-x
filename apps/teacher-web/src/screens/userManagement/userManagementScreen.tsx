import { useState } from "react";
import { UserPlus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AdminHeader } from "../../components/layoutAdmin/adminHeader";
import { AdminSidebar } from "../../components/layoutAdmin/adminSidebar";
import { useUserManagement } from "../../hooks/useUserManagement";
import type { CreateUserPayload, UpdateUserPayload } from "../../services/userManagementService";

// badge color per role
const roleBadgeStyle: Record<"teacher" | "student", string> = {
  teacher: "bg-[var(--color-accent)] text-[var(--color-accent-content)]",
  student: "bg-[var(--color-secondary)] text-[var(--color-secondary-content)]",
};

// formats a raw ISO timestamp into a readable date string e.g. "2023-10-12"
function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}

export function UserManagementScreen() {
  const { users, isLoading, error, createNewUser, editUser, removeUser } =
    useUserManagement();

  const [searchQuery, setSearchQuery] = useState("");

  // controls whether the Add Account form panel is visible
  const [showAddForm, setShowAddForm] = useState(false);

  // holds the form field values when adding a new user
  const [newUser, setNewUser] = useState<CreateUserPayload>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "student",
    id_number: "",
  });

  // tracks which user row is being edited and the current edit values
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<UpdateUserPayload>({});

  // narrows the list to rows matching the search query
  const filteredUsers = users.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email} ${user.id_number}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // counts for the stat cards, derived from live data
  const totalTeachers = users.filter((u) => u.role === "teacher").length;
  const totalStudents = users.filter((u) => u.role === "student").length;

  // submits the add-user form
  async function handleAddUser() {
    try {
      await createNewUser(newUser);
      setShowAddForm(false);
      setNewUser({ first_name: "", last_name: "", email: "", password: "", role: "student", id_number: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  // saves an inline edit
  async function handleSaveEdit(userId: string) {
    try {
      await editUser(userId, editingFields);
      setEditingUserId(null);
      setEditingFields({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user.");
    }
  }

  // prompts before deleting so the admin cannot accidentally remove an account
  async function handleDelete(userId: string, firstName: string, lastName: string) {
    const confirmed = window.confirm(
      `Delete account for ${firstName} ${lastName}? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await removeUser(userId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user.");
    }
  }

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <AdminSidebar activeItem="userManagement" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader searchValue={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-xs opacity-60 mb-2">
            Core System &gt; Account Management
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
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-primary-content)] rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 shrink-0"
            >
              <UserPlus size={16} />
              Add Account
            </button>
          </div>

          {/* add account form panel */}
          {showAddForm && (
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-6 mb-6">
              <h2 className="text-base font-semibold mb-4">New Account</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">ID Number</label>
                  <input
                    type="text"
                    value={newUser.id_number}
                    onChange={(e) => setNewUser({ ...newUser, id_number: e.target.value })}
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs opacity-60 uppercase tracking-wide">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as "teacher" | "student" })
                    }
                    className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleAddUser}
                  className="bg-[var(--color-primary)] text-[var(--color-primary-content)] rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  Create Account
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="border border-[var(--color-base-300)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-base-200)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* stat cards derived from live data */}
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

          {/* loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm opacity-60 py-8">
              <Loader2 size={16} className="animate-spin" />
              Loading accounts...
            </div>
          )}

          {/* error state */}
          {error && (
            <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl px-5 py-4 text-sm mb-4">
              {error}
            </div>
          )}

          {/* user table */}
          {!isLoading && !error && (
            <div className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wide opacity-60 bg-[var(--color-base-200)]">
                    <th className="text-left py-3 px-5 font-medium">First Name</th>
                    <th className="text-left py-3 px-5 font-medium">Last Name</th>
                    <th className="text-left py-3 px-5 font-medium">ID</th>
                    <th className="text-left py-3 px-5 font-medium">Email</th>
                    <th className="text-left py-3 px-5 font-medium">Role</th>
                    <th className="text-left py-3 px-5 font-medium">Created</th>
                    <th className="text-left py-3 px-5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-[var(--color-base-200)] ${
                        index < filteredUsers.length - 1
                          ? "border-b border-[var(--color-base-300)]"
                          : ""
                      }`}
                    >
                      {/* first name, editable inline */}
                      <td className="py-3.5 px-5">
                        {editingUserId === user.id ? (
                          <input
                            type="text"
                            value={editingFields.first_name ?? user.first_name}
                            onChange={(e) =>
                              setEditingFields({ ...editingFields, first_name: e.target.value })
                            }
                            className="border border-[var(--color-base-300)] rounded px-2 py-0.5 text-sm outline-none bg-[var(--color-base-200)] w-full"
                          />
                        ) : (
                          <p className="font-medium text-sm">{user.first_name}</p>
                        )}
                      </td>

                      {/* last name, editable inline */}
                      <td className="py-3.5 px-5">
                        {editingUserId === user.id ? (
                          <input
                            type="text"
                            value={editingFields.last_name ?? user.last_name}
                            onChange={(e) =>
                              setEditingFields({ ...editingFields, last_name: e.target.value })
                            }
                            className="border border-[var(--color-base-300)] rounded px-2 py-0.5 text-sm outline-none bg-[var(--color-base-200)] w-full"
                          />
                        ) : (
                          <p className="font-medium text-sm">{user.last_name}</p>
                        )}
                      </td>

                      {/* id number */}
                      <td className="py-3.5 px-5 text-sm opacity-70">{user.id_number}</td>

                      {/* email */}
                      <td className="py-3.5 px-5 text-sm">{user.email}</td>

                      {/* role badge */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full ${roleBadgeStyle[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* created date */}
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {formatDate(user.created_at)}
                      </td>

                      {/* actions */}
                      <td className="py-3.5 px-5">
                        <div className="flex gap-1">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(user.id)}
                                className="px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-[var(--color-primary-content)]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditingFields({});
                                }}
                                className="px-2 py-1 text-xs rounded border border-[var(--color-base-300)]"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingFields({
                                  first_name: user.first_name,
                                  last_name: user.last_name,
                                });
                              }}
                              className="p-1.5 rounded-full hover:bg-[var(--color-base-200)]"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id, user.first_name, user.last_name)}
                            className="p-1.5 rounded-full hover:bg-[var(--color-error)]/10 text-[var(--color-error)]"
                          >
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
          )}

          <p className="text-xs opacity-50 mt-3">
            Listing {filteredUsers.length} of {users.length} records
          </p>
        </main>
      </div>
    </div>
  );
}