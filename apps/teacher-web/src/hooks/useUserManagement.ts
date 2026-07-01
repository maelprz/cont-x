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

interface UseUserManagementReturn {
  users: UserRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNewUser: (payload: CreateUserPayload) => Promise<void>;
  editUser: (userId: string, payload: UpdateUserPayload) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
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

  // creates a user then refreshes the list so the new row appears
  async function createNewUser(payload: CreateUserPayload): Promise<void> {
    await createUser(payload);
    await refetch();
  }

  // updates a user then refreshes the list
  async function editUser(
    userId: string,
    payload: UpdateUserPayload
  ): Promise<void> {
    await updateUser(userId, payload);
    await refetch();
  }

  // deletes a user then refreshes the list
  async function removeUser(userId: string): Promise<void> {
    await deleteUser(userId);
    await refetch();
  }

  return { users, isLoading, error, refetch, createNewUser, editUser, removeUser };
}