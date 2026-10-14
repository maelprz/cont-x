import { useEffect, useMemo, useState } from "react"; 
import type { TeacherOption } from "../../services/subjectsClassesService"; 

// Modal for adding a class to a subject and choosing its teacher. Sits above the subject detail modal.
export function NewClassModal({
  isOpen,
  subjectName, 
  subjectPrefix, 
  teachers, 
  isSaving, 
  error,
  onClose, 
  onSubmit, 
}: {
  isOpen: boolean; 
  subjectName: string; 
  subjectPrefix: string; 
  teachers: TeacherOption[]; 
  isSaving: boolean; 
  error: string | null;
  onClose: () => void; 
  onSubmit: (name: string, teacherId: string) => void; 
}) {
  const [name, setName] = useState(""); 
  const [teacherSearch, setTeacherSearch] = useState(""); 
  const [teacherId, setTeacherId] = useState<string | null>(null); 

  useEffect(() => { 
    if (isOpen) { 
      setName(""); 
      setTeacherSearch("");
      setTeacherId(null); 
    }
  }, [isOpen]);

  const filteredTeachers = useMemo(() => { 
    const q = teacherSearch.trim().toLowerCase(); 
    return teachers.filter((t) => `${t.fullName} ${t.idNumber}`.toLowerCase().includes(q));
  }, [teachers, teacherSearch]);

  if (!isOpen) return null; 

  const canSubmit = name.trim() !== "" && teacherId !== null && !isSaving; // needs a name, a teacher, and no save in progress

  function submit() { // runs when the user confirms
    if (canSubmit && teacherId) onSubmit(name, teacherId); // only when everything is filled in
  }

  return (
    <div
      onClick={isSaving ? undefined : onClose} // clicking the dark area closes it, unless a save is running
      className="fixed inset-0 flex items-center justify-center z-[60]" // above the detail modal
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // clicks inside the card must not close the modal
        className="w-[460px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {/* title and explanation */}
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          New Class
        </h2>
        <p className="text-[13px] mb-5 opacity-60" style={{ color: "var(--color-base-content)" }}>
          Adding to {subjectName}. A class code starting with {subjectPrefix} is generated automatically.
        </p>

        {/* the class name field */}
        <label className="text-[12px] font-medium opacity-70 block mb-1.5" style={{ color: "var(--color-base-content)" }}>
          Class name
        </label>
        <input
          autoFocus // put the cursor in the box straight away
          type="text"
          value={name} // shows what has been typed
          onChange={(e) => setName(e.target.value)} // keeps the typed text in state
          onKeyDown={(e) => e.key === "Enter" && submit()} // Enter submits when allowed
          placeholder="e.g. BSIT 2A"
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] outline-none mb-4"
          style={{ borderColor: "var(--color-base-300)", backgroundColor: "var(--color-base-200)", color: "var(--color-base-content)" }}
        />

        {/* the teacher picker */}
        <label className="text-[12px] font-medium opacity-70 block mb-1.5" style={{ color: "var(--color-base-content)" }}>
          Assign teacher
        </label>
        <input
          type="text"
          value={teacherSearch} // shows what has been typed
          onChange={(e) => setTeacherSearch(e.target.value)} // filters the list below
          placeholder="Search by name or ID number"
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none mb-2"
          style={{ borderColor: "var(--color-base-300)", backgroundColor: "var(--color-base-200)", color: "var(--color-base-content)" }}
        />
        <div
          className="max-h-44 overflow-y-auto rounded-lg border"
          style={{ borderColor: "var(--color-base-300)" }}
        >
          {teachers.length === 0 && ( // no teacher accounts exist at all
            <p className="text-[13px] opacity-60 p-3" style={{ color: "var(--color-base-content)" }}>
              No teacher accounts exist yet. Create one in User Management first.
            </p>
          )}
          {teachers.length > 0 && filteredTeachers.length === 0 && ( // teachers exist, but none match the search
            <p className="text-[13px] opacity-60 p-3" style={{ color: "var(--color-base-content)" }}>
              No teachers match your search.
            </p>
          )}
          {filteredTeachers.map((t) => ( // one row per matching teacher
            <button
              type="button" // not a form button
              key={t.id} // unique key for React
              onClick={() => setTeacherId(t.id)} // choose this teacher
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none flex items-center justify-between"
              style={{
                backgroundColor: teacherId === t.id ? "var(--color-primary)" : "transparent", // highlight the chosen teacher
                color: teacherId === t.id ? "var(--color-primary-content)" : "var(--color-base-content)", // readable text on the highlight
              }}
            >
              <span className="font-medium">{t.fullName}</span>
              <span className="text-[12px] opacity-70">{t.idNumber}</span>
            </button>
          ))}
        </div>

        {/* inline error from the database */}
        {error && (
          <p className="text-[12px] mt-3" style={{ color: "var(--color-error)" }}>
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
            onClick={submit} // create the class
            disabled={!canSubmit} // needs a name, a teacher, and no save in progress
            className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            {isSaving ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  );
}