// userManagementScreen.types.ts
// Defines the shape of data the User Management screen needs.

export type UserRole = "teacher" | "student";

export interface UserDirectoryEntry {
  id: string;          // internal row id
  name: string;        // full display name
  initials: string;    // for the avatar badge, e.g. "DA"
  systemId: string;    // e.g. "T-48293" or "S-99218"
  email: string;
  role: UserRole;
  createdDate: string; // display string e.g. "2023-10-12"
}

export interface UserManagementScreenProps {
  totalTeachers?: number;
  totalStudents?: number;
  users?: UserDirectoryEntry[];
  onAddAccount?: () => void;
}