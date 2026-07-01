import { useEffect } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  type AuthUser,
} from "../services/authService";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// DIP boundary — loginScreen calls this hook, never authService directly.
export function useAuth(): UseAuthReturn {
  const { user, setUser, isLoading, setIsLoading } = useAuthStore();

  // Checks for an existing session once on mount —
  // stops a logged-in student from being kicked back to login on app restart.
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const existingUser = await getCurrentUser();
        setUser(existingUser); // null if no session, AuthUser if one exists
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false); // done checking — router can now decide which screen to show
      }
    }

    checkExistingSession();
  }, []); // empty array — once on mount only

  async function login(email: string, password: string) {
    const loggedInUser = await loginService(email, password);
    setUser(loggedInUser); // stored globally — Dashboard can read name/idNumber from here
  }

  async function logout() {
    await logoutService();
    setUser(null); // clears the student — router redirects to login
  }

  return { user, isLoading, login, logout };
}
