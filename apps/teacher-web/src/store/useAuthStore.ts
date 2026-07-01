import { create } from "zustand";
import type { AuthUser } from "../services/authService";

interface AuthState {
  user: AuthUser | null; //null means nobody is logged in
  isLoading: boolean; //true means the app is checking if a user is logged in
  setUser: (user: AuthUser | null) => void; //called after login or logout to update the state
  setIsLoading: (loading: boolean) => void; //called when the app is checking if a user is logged in
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
