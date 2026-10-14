import { useEffect, useState } from "react"; 

// Small modal that asks for a subject name, in the same style as the question bank's modal.
export function NewSubjectModal({
  isOpen, 
  isSaving, 
  error,
  onClose, 
  onSubmit, 
}: {
  isOpen: boolean; 
  isSaving: boolean; 
  error: string | null; 
  onClose: () => void; 
  onSubmit: (name: string) => void; 
}) {
  const [name, setName] = useState(""); // the text typed into the input

  useEffect(() => { 
    if (isOpen) setName(""); // start with an empty box every time
  }, [isOpen]);

  if (!isOpen) return null; // render nothing when the modal is closed

  const canSubmit = name.trim() !== "" && !isSaving; // the button works only with a name and no save in progress

  return (
    <div
      onClick={isSaving ? undefined : onClose} // clicking the dark area closes it, unless a save is running
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // clicks inside the card must not close the modal
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {/* title and explanation */}
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          New Subject
        </h2>
        <p className="text-[13px] mb-5 opacity-60" style={{ color: "var(--color-base-content)" }}>
          A 2-digit code is assigned automatically and starts every class code in this subject.
        </p>

        {/* the name field */}
        <label className="text-[12px] font-medium opacity-70 block mb-1.5" style={{ color: "var(--color-base-content)" }}>
          Subject name
        </label>
        <input
          autoFocus // put the cursor in the box straight away
          type="text"
          value={name} // shows what has been typed
          onChange={(e) => setName(e.target.value)} // keeps the typed text in state
          onKeyDown={(e) => e.key === "Enter" && canSubmit && onSubmit(name)} // Enter submits when allowed
          placeholder="e.g. Computer Programming"
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] outline-none"
          style={{ borderColor: "var(--color-base-300)", backgroundColor: "var(--color-base-200)", color: "var(--color-base-content)" }}
        />

        {/* inline error from the database, such as a duplicate name */}
        {error && (
          <p className="text-[12px] mt-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {/* buttons */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose} // cancel
            disabled={isSaving} // cannot cancel mid-save
            className="flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(name)} // create with the typed name
            disabled={!canSubmit} // needs a name and no save in progress
            className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            {isSaving ? "Creating..." : "Create Subject"}
          </button>
        </div>
      </div>
    </div>
  );
}