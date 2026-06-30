// Describes what AppHeader needs from whoever renders it.
export interface AppHeaderProps {
  studentName?: string; // optional — defaults to a mock name if a screen doesn't pass one
  studentId?: string; // optional — same idea
  variant?: "full" | "minimal";
}
