import { useEffect } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

export interface ToastState {
  message: string; // text shown to the teacher
  type: "success" | "error" | "loading";
  action?: { label: string; run: () => void };
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
    if (!toast || toast.type === "loading" || toast.action) return;
    const timer = setTimeout(onDismiss, 3000); // auto-hide after 3 seconds
    return () => clearTimeout(timer); // cancel timer if toast changes early
  }, [toast, onDismiss]);

  if (!toast) return null; // nothing to render

  const Icon = toast.type === "loading" ? LoaderCircle : toast.type === "success" ? CheckCircle2 : XCircle;
  const color = toast.type === "loading" ? "#465a3b" : toast.type === "success" ? "#22c55e" : "var(--color-error)";

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex max-w-[calc(100%-3rem)] items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg"
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: color,
      }}
    >
      <Icon size={18} aria-hidden="true" style={{ color }} className={toast.type === "loading" ? "shrink-0 motion-safe:animate-spin" : "shrink-0"} />
      <span role={toast.type === "error" ? "alert" : "status"} className="wrap-anywhere text-[13px] font-medium" style={{ color: "var(--color-base-content)" }}>
        {toast.message}
      </span>
      {toast.action && <button type="button" className="shrink-0 rounded px-1 text-[13px] font-semibold underline focus-visible:outline-2" onClick={toast.action.run}>{toast.action.label}</button>}
    </div>
  );
}
