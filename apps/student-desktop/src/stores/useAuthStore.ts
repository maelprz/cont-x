import { create } from "zustand"; // Zustand's store factory
import type { AuthUser } from "../services/authService"; // Type for the logged-in student

interface AuthState {
  user: AuthUser | null; // null = nobody logged in
  isLoading: boolean; // true while checking for an existing session on startup
  setUser: (user: AuthUser | null) => void;
  setIsLoading: (loading: boolean) => void;
}

// Global auth state — any component can read the logged-in student's
// name, id, and idNumber without prop drilling.
// This is what replaces mockStudentName and mockStudentId across all screens.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // starts true — session check on startup fills this in
  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
