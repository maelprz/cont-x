import { useToastStore } from "../store/useToastStore";

// Thin wrapper kept for compatibility — actual state now lives in useToastStore,
// so a toast survives navigation instead of unmounting with the screen that triggered it.
export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const showToast = useToastStore((state) => state.showToast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  return { toast, showToast, dismissToast };
}