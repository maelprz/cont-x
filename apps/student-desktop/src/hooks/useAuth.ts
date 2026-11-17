import { useAuthStore } from "../stores/useAuthStore";
import { useExamSessionStore } from "../stores/useExamSessionStore";
import { useRouterLogic } from "../router/routerLogic";
import { getOfflineResumeIdentity } from "../services/offlineExamService";
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
  const { user, setUser, isLoading } = useAuthStore(); 

  async function login(idNumber: string, password: string) {
    const loggedInUser = await loginService(idNumber, password);
    const resume = getOfflineResumeIdentity();
    if (!loggedInUser.mustChangePassword && resume?.user.id === loggedInUser.id) {
      const exam = await window.ipcRenderer.loadOfflineExam({
        studentId: loggedInUser.id, sessionId: resume.sessionId,
      });
      if (exam) {
        useExamSessionStore.getState().restoreOfflineExam(exam);
        useRouterLogic.getState().navigateTo("examQuestion");
      }
    }
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
