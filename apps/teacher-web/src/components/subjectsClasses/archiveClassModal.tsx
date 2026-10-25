export function ArchiveClassModal({
  target, 
  isSaving, 
  error, 
  onClose,
  onConfirm, 
}: {
  target: { id: string; name: string } | null; 
  isSaving: boolean; 
  error: string | null; 
  onClose: () => void; 
  onConfirm: () => void; 
}) {
  if (!target) return null;

  return (
    <div
      onClick={isSaving ? undefined : onClose} 
      className="fixed inset-0 flex items-center justify-center z-[60]" 
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {/* title and explanation of what archiving does */}
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          Archive {target.name}?
        </h2>
        <p className="text-[13px] mb-5 opacity-60 leading-relaxed" style={{ color: "var(--color-base-content)" }}>
          Students in this class keep access to their past results. No new students or exams can be added to it.
          This cannot be undone from the app.
        </p>

        {/* inline error from the database, for example an active exam */}
        {error && (
          <p className="text-[12px] mb-4" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {/* buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving} 
            className="flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm} 
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-error)", color: "var(--color-error-content)" }}
          >
            {isSaving ? "Archiving..." : "Archive Class"}
          </button>
        </div>
      </div>
    </div>
  );
}