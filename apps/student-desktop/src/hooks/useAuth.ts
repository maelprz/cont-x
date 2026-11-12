import { useAuthStore } from "../stores/useAuthStore";
import {
  login as loginService,
  logout as logoutService,
  completePasswordChange as completePasswordChangeService, // the server call for the first-login password change
  type AuthUser,
} from "../services/authService";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>; // used by the first-login modal
}

// no useEffect here — session check lives in AppRouter only
export function useAuth(): UseAuthReturn {
  const { user, setUser, isLoading, setIsLoading } = useAuthStore();

  async function login(idNumber: string, password: string) {
    const loggedInUser = await loginService(idNumber, password);
    setUser(loggedInUser);
  }

  async function logout() {
    await logoutService();
    setUser(null);
  }

  async function changePassword(newPassword: string) { // runs when the modal is submitted
    await completePasswordChangeService(newPassword); // throws if the server refuses, so the modal can show the message
    if (user) setUser({ ...user, mustChangePassword: false }); // the flag is now false on the server, so match it locally and the modal closes
  } // end of changePassword

  return { user, isLoading, login, logout, changePassword };
}