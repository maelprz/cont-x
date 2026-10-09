import { useState, useEffect } from "react";
import { UserPlus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AdminHeader } from "../../components/layoutAdmin/adminHeader";
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar";
import { useUserManagement } from "../../hooks/useUserManagement";
import { getCurrentUser, type AuthUser } from "../../services/authService"; // new: tells us who is logged in
import type { CreateUserPayload, UpdateUserPayload, UserRecord } from "../../services/userManagementService";

// badge color per role
const roleBadgeStyle: Record<UserRecord["role"], string> = {
  teacher: "bg-[var(--color-accent)] text-[var(--color-accent-content)]",
  student: "bg-[var(--color-secondary)] text-[var(--color-secondary-content)]",
  admin: "bg-[var(--color-primary)] text-[var(--color-primary-content)]",
  superadmin: "bg-[var(--color-primary)] text-[var(--color-primary-content)]",
};

// formats a raw ISO timestamp into a readable date string e.g. "2023-10-12"
function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}

export function UserManagementScreen() {
  const { users, isLoading, error, createNewUser, editUser, removeUser, changeAdminRole } = // changed: changeAdminRole is new
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

  const [editingIsAdmin, setEditingIsAdmin] = useState(false); // new: value of the Admin checkbox while a row is being edited
  const [viewer, setViewer] = useState<AuthUser | null>(null); // new: the logged-in person looking at this screen

  useEffect(() => { // new: runs once when the screen opens
    getCurrentUser().then(setViewer); // new: loads who is logged in so we can decide what to offer
  }, []); // new: empty list means run only once

  const viewerIsTop = viewer?.role === "admin" || viewer?.role === "superadmin"; // new: true for the top-level account (000 until the rename)

  // new: can the viewer edit or delete this row at all, following the rank rule
  function canManage(user: UserRecord): boolean {
    if (!viewer) return false; // not loaded yet, so offer nothing
    if (viewerIsTop) return true; // the top-level account can manage every row
    const targetIsAdmin = user.role === "admin" || user.role === "superadmin" || user.has_admin_grant; // is the row an admin of any kind
    return !targetIsAdmin; // delegated admins can only manage accounts that are not admins
  }

  // new: can the viewer flip the Admin checkbox on this row
  function canChangeAdmin(user: UserRecord): boolean {
    if (!viewer || user.role !== "teacher" || user.id === viewer.id) return false; // only teachers, and never your own row
    return user.has_admin_grant ? viewerIsTop : true; // revoking needs the top-level account, granting is open to any admin
  }

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

  // changed: saves an inline edit, including the Admin checkbox
  async function handleSaveEdit(user: UserRecord) {
    try { // show a message instead of crashing if anything is rejected
      const namesChanged = // did the person change either name
        editingFields.first_name !== user.first_name || editingFields.last_name !== user.last_name; // compare with the stored values
      if (namesChanged) await editUser(user.id, editingFields); // save names only when they changed
      if (editingIsAdmin !== user.has_admin_grant) { // did the checkbox change
        await changeAdminRole(user.id, editingIsAdmin); // grant or revoke through the edge function
      }
      setEditingUserId(null); // leave edit mode
      setEditingFields({}); // clear the edit values
    } catch (err) { // something was rejected
      alert(err instanceof Error ? err.message : "Failed to update user."); // show the real reason
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
      <AdminAreaSidebar activeItem="userManagement" />

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

                      {/* changed: role badges plus the Admin checkbox while editing a teacher */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full ${roleBadgeStyle[user.role]}`}
                          >
                            {user.role}
                          </span>
                          {user.has_admin_grant && editingUserId !== user.id && ( // extra badge for teachers who hold the grant
                            <span className="text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-content)]">
                              admin
                            </span>
                          )}
                          {editingUserId === user.id && user.role === "teacher" && ( // the checkbox only exists while editing a teacher row
                            <label
                              className="flex items-center gap-1.5 text-xs cursor-pointer"
                              title={canChangeAdmin(user) ? "" : "You cannot change the admin role for this account."} // hint shown when the box is disabled
                            >
                              <input
                                type="checkbox" // the Make Admin toggle
                                checked={editingIsAdmin} // current checkbox value
                                disabled={!canChangeAdmin(user)} // disabled when the rank rule would reject it
                                onChange={(e) => setEditingIsAdmin(e.target.checked)} // nothing is sent until Save
                              />
                              Admin
                            </label>
                          )}
                        </div>
                      </td>

                      {/* created date */}
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {formatDate(user.created_at)}
                      </td>

                      {/* changed: actions respect the rank rule */}
                      <td className="py-3.5 px-5">
                        <div className="flex gap-1">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(user)} // changed: passes the whole row, not just the id
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
                            canManage(user) && ( // hide the pencil on rows the viewer is not allowed to edit
                              <button
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setEditingFields({
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                  });
                                  setEditingIsAdmin(user.has_admin_grant); // starts the checkbox from the current grant
                                }}
                                className="p-1.5 rounded-full hover:bg-[var(--color-base-200)]"
                              >
                                <Pencil size={13} />
                              </button>
                            )
                          )}
                          {canManage(user) && user.id !== viewer?.id && ( // hide the trash on rows you cannot manage and on your own row
                            <button
                              onClick={() => handleDelete(user.id, user.first_name, user.last_name)}
                              className="p-1.5 rounded-full hover:bg-[var(--color-error)]/10 text-[var(--color-error)]"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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