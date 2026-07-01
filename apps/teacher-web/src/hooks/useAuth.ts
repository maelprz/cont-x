import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
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

export function useAuth(): UseAuthReturn {
  const { user, setUser, isLoading, setIsLoading } = useAuthStore();

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const existingUser = await getCurrentUser();
        setUser(existingUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingSession();
  }, []);

  async function login(email: string, password: string) {
    const loggedInUser = await loginService(email, password);
    setUser(loggedInUser);
  }

  async function logout() {
    await logoutService();
    setUser(null);
  }

  return { user, isLoading, login, logout };
}
