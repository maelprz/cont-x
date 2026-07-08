import { useState, useCallback } from "react";
import type { ToastState } from "../components/shared/toast";

// Tracks one toast message at a time, for simple save/error feedback.
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type }); // replaces any toast currently showing
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}