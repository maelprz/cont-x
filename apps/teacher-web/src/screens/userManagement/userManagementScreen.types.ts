// userManagementScreen.types.ts
// Defines the shape of data the User Management screen needs.

export type UserRole = "teacher" | "student";

export interface UserDirectoryEntry {
  id: string;
  first_name: string;
  last_name: string;
  systemId: string;
  email: string;
  role: UserRole;
  createdDate: string;
}

export interface UserManagementScreenProps {
  totalTeachers?: number;
  totalStudents?: number;
  users?: UserDirectoryEntry[];
  onAddAccount?: () => void;
}