import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ToastState {
  message: string; // text shown to the teacher
  type: "success" | "error"; // decides the icon and border color
}

// Small floating notification, auto-dismisses after 3 seconds.
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return; // nothing showing, skip the timer
    const timer = setTimeout(onDismiss, 3000); // auto-hide after 3 seconds
    return () => clearTimeout(timer); // cancel timer if toast changes early
  }, [toast, onDismiss]);

  if (!toast) return null; // nothing to render

  const isSuccess = toast.type === "success";

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg"
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: isSuccess ? "#22c55e" : "var(--color-error)",
      }}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
      ) : (
        <XCircle size={18} style={{ color: "var(--color-error)" }} />
      )}
      <span className="text-[13px] font-medium" style={{ color: "var(--color-base-content)" }}>
        {toast.message}
      </span>
    </div>
  );
}