import { create } from "zustand";
import type { ToastState } from "../components/shared/toast";

interface ToastStore {
  toast: ToastState | null; // lives here, not in any one screen, so it survives navigation
  showToast: (message: string, type?: "success" | "error") => void;
  dismissToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  showToast: (message, type = "success") => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}));