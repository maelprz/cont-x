interface UnsavedChangesPromptProps {
  isOpen: boolean;
  onSave: () => void | Promise<void>;
  onLeaveWithoutSaving: () => void;
  onCancel: () => void;
}

export function UnsavedChangesPrompt({
  isOpen,
  onSave,
  onLeaveWithoutSaving,
  onCancel,
}: UnsavedChangesPromptProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          Unsaved Changes
        </h2>
        <p className="text-[13px] mb-5 opacity-60" style={{ color: "var(--color-base-content)" }}>
          You have unsaved changes to this exam. Save before leaving?
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onSave}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            Save Changes
          </button>
          <button
            onClick={onLeaveWithoutSaving}
            className="px-4 py-2.5 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-error)", backgroundColor: "transparent" }}
          >
            Leave Without Saving
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
            style={{ color: "var(--color-base-content)", opacity: 0.7 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}