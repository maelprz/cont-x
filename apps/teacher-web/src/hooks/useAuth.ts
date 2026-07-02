import { useAuthStore } from "../store/useAuthStore";
import {
  login as loginService,
  logout as logoutService,
  type AuthUser,
} from "../services/authService";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<void>; // was email, now idNumber
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, setUser, isLoading } = useAuthStore();

  async function login(idNumber: string, password: string) {
    const loggedInUser = await loginService(idNumber, password);
    setUser(loggedInUser);
  }

  async function logout() {
    await logoutService();
    setUser(null);
  }

  return { user, isLoading, login, logout };
}
