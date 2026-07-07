import { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  type UserRecord,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "../services/userManagementService";
import { logAdminAction } from "../services/auditLogService";
import { getCurrentUser } from "../services/authService";

interface UseUserManagementReturn {
  users: UserRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNewUser: (payload: CreateUserPayload) => Promise<void>;
  editUser: (userId: string, payload: UpdateUserPayload) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
}

// builds a short description of what fields changed during an update
function describeUpdate(before: UserRecord, changes: UpdateUserPayload): string {
  const parts: string[] = [];

  if (changes.first_name && changes.first_name !== before.first_name) {
    parts.push(`first name from ${before.first_name} to ${changes.first_name}`);
  }
  if (changes.last_name && changes.last_name !== before.last_name) {
    parts.push(`last name from ${before.last_name} to ${changes.last_name}`);
  }
  if (changes.email && changes.email !== before.email) {
    parts.push(`email from ${before.email} to ${changes.email}`);
  }
  if (changes.role && changes.role !== before.role) {
    parts.push(`role from ${before.role} to ${changes.role}`);
  }
  if (changes.id_number && changes.id_number !== before.id_number) {
    parts.push(`ID number from ${before.id_number} to ${changes.id_number}`);
  }

  return parts.length > 0 ? `Updated ${parts.join(", ")}` : "Updated account details";
}

export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetches the full user list and stores it in state
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // runs once when the screen first mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  // creates a user, logs the action, then refreshes the list
  async function createNewUser(payload: CreateUserPayload): Promise<void> {
    await createUser(payload);

    // fetch the logged in admin so we know who performed this action
    const admin = await getCurrentUser();
    if (admin) {
      await logAdminAction({
        adminId: admin.id,
        adminName: admin.fullName,
        actionType: "create",
        targetUserId: null, // new user's id is not returned by createUser
        targetName: `${payload.first_name} ${payload.last_name}`,
        targetRole: payload.role,
        details: `Created ${payload.role} account with email ${payload.email}`,
      });
    }

    await refetch();
  }

  // updates a user, logs what changed, then refreshes the list
  async function editUser(
    userId: string,
    payload: UpdateUserPayload
  ): Promise<void> {
    // grab the current row before updating, so we can describe what changed
    const existingUser = users.find((u) => u.id === userId);

    await updateUser(userId, payload);

    const admin = await getCurrentUser();
    if (admin && existingUser) {
      await logAdminAction({
        adminId: admin.id,
        adminName: admin.fullName,
        actionType: "update",
        targetUserId: userId,
        targetName: `${existingUser.first_name} ${existingUser.last_name}`,
        targetRole: existingUser.role,
        details: describeUpdate(existingUser, payload),
      });
    }

    await refetch();
  }

  // deletes a user, logs the action, then refreshes the list
  async function removeUser(userId: string): Promise<void> {
    const existingUser = users.find((u) => u.id === userId);

    await deleteUser(userId);

    const admin = await getCurrentUser();
    if (admin && existingUser) {
      await logAdminAction({
        adminId: admin.id,
        adminName: admin.fullName,
        actionType: "delete",
        targetUserId: null, // user no longer exists after deletion
        targetName: `${existingUser.first_name} ${existingUser.last_name}`,
        targetRole: existingUser.role,
        details: `Deleted ${existingUser.role} account with email ${existingUser.email}`,
      });
    }

    await refetch();
  }

  return { users, isLoading, error, refetch, createNewUser, editUser, removeUser };
}