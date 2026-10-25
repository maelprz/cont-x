import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  SubjectSummary,
  ClassSummary,
} from "../../services/subjectsClassesService";

// Modal showing one subject and its classes, with add class, enroll student, and archive actions.
export function SubjectDetailModal({
  subject,
  onClose,
  onAddClass,
  onEnroll,
  onArchiveClass,
}: {
  subject: SubjectSummary | null;
  onClose: () => void;
  onAddClass: () => void;
  onEnroll: (cls: ClassSummary) => void;
  onArchiveClass: (classId: string, className: string) => void; // opens the archive confirmation
}) {
  const [showArchived, setShowArchived] = useState(false); // whether archived classes are visible

  useEffect(() => {
    // runs when a different subject is opened
    setShowArchived(false); // always start with archived classes hidden
  }, [subject?.id]);

  if (!subject) return null; // render nothing when no subject is selected

  const activeClasses = subject.classes.filter((c) => c.archivedAt === null); // classes still in use
  const archivedClasses = subject.classes.filter((c) => c.archivedAt !== null); // classes already archived
  const rows = showArchived
    ? [...activeClasses, ...archivedClasses]
    : activeClasses; // active first, archived only on request

  return (
    <div
      onClick={onClose} // clicking the dark area closes the modal
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // clicks inside the card must not close the modal
        className="w-[720px] max-h-[80vh] flex flex-col rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {/* header: prefix badge, subject name, counts, close button */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <span
              className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-content)",
              }}
            >
              {subject.codePrefix}
            </span>
            <h2
              className="text-[17px] font-bold"
              style={{ color: "var(--color-base-content)" }}
            >
              {subject.name}
            </h2>
            <p
              className="text-[13px] opacity-60 mt-0.5"
              style={{ color: "var(--color-base-content)" }}
            >
              {activeClasses.length} active{" "}
              {activeClasses.length === 1 ? "class" : "classes"}
              {archivedClasses.length > 0
                ? `, ${archivedClasses.length} archived`
                : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="cursor-pointer border-none bg-transparent p-1 opacity-60 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* toolbar: archived toggle and the Add Class button */}
        <div className="flex items-center justify-between px-6 pb-3">
          <h3
            className="text-[14px] font-semibold"
            style={{ color: "var(--color-base-content)" }}
          >
            Classes
          </h3>
          <div className="flex items-center gap-4">
            {archivedClasses.length > 0 && ( // only offer the toggle when archived classes exist
              <label
                className="flex items-center gap-1.5 text-[12px] cursor-pointer"
                style={{ color: "var(--color-base-content)" }}
              >
                <input
                  type="checkbox"
                  checked={showArchived} // reflects the current state
                  onChange={(e) => setShowArchived(e.target.checked)} // flips the state
                />
                Show archived
              </label>
            )}
            <button
              onClick={onAddClass}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-content)",
              }}
            >
              Add Class
            </button>
          </div>
        </div>

        {/* the classes list, scrolls inside the modal if it gets long */}
        <div className="px-6 pb-6 overflow-y-auto">
          {rows.length === 0 ? ( // nothing to list
            <p
              className="text-[13px] opacity-60 py-6 text-center"
              style={{ color: "var(--color-base-content)" }}
            >
              No classes yet. Add the first one to this subject.
            </p>
          ) : (
            <table
              className="w-full border-collapse text-[13px]"
              style={{ color: "var(--color-base-content)" }}
            >
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide opacity-60">
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Teacher</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const isArchived = c.archivedAt !== null; // used for the status and the dimmed look
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-[var(--color-base-300)] ${isArchived ? "opacity-60" : ""}`}
                    >
                      <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.offerCode}</td>
                      <td className="py-2.5 pr-3">{c.teacherName}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={
                            isArchived
                              ? {
                                  backgroundColor: "var(--color-base-300)",
                                  color: "var(--color-base-content)",
                                } // grey pill
                              : {
                                  backgroundColor: "var(--color-success)",
                                  color: "var(--color-success-content)",
                                } // green pill
                          }
                        >
                          {isArchived ? "Archived" : "Active"}
                        </span>
                      </td>
                                            <td className="py-2.5 text-right">
                        {!isArchived && ( // only active classes can be enrolled into or archived
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => onEnroll(c)} // opens the enroll modal for this class
                              className="px-2.5 py-1 rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                              style={{
                                backgroundColor: "var(--color-primary)",
                                color: "var(--color-primary-content)",
                              }}
                            >
                              Enroll student
                            </button>
                            <button
                              onClick={() => onArchiveClass(c.id, c.name)} // opens the archive confirmation for this class
                              className="px-2.5 py-1 rounded-lg border text-[12px] cursor-pointer transition-opacity hover:opacity-70 bg-transparent"
                              style={{
                                borderColor: "var(--color-base-300)",
                                color: "var(--color-base-content)",
                              }}
                            >
                              Archive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
