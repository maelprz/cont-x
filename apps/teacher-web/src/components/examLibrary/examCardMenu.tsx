import { useState } from "react";
import { MoreVertical } from "lucide-react";
import type { ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";

type ExamCardMenuProps = {
  status: ExamStatus; // draft | saved now
  hasClassAttachments: boolean;
  hasActiveClassAttachment: boolean;
  isProcessing: boolean;
  onManageClasses: () => void; // opens the class-attachment list (publish/end/settings live there now)
  onDelete: () => void;
  onEditExam: () => void;
};

export function ExamCardMenu({
  status,
  hasClassAttachments,
  hasActiveClassAttachment,
  isProcessing,
  onManageClasses,
  onDelete,
  onEditExam,
}: ExamCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false); // whether the dropdown is showing

  const canManageClasses = status === "saved"; // nothing to attach a class to until authoring is done
  // deleting an attached exam is blocked at the service layer too — disabled
  // here mainly so the teacher doesn't hit that error round-trip at all
  const canDelete = !hasClassAttachments;

  // opens or closes the dropdown without triggering the card's own click
  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // closes the menu, then runs whichever action was clicked
  const runAndClose = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="p-1 rounded-lg cursor-pointer border-none bg-transparent transition-colors duration-150 hover:opacity-70 text-[var(--color-base-content)] opacity-50"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          {/* invisible layer, clicking anywhere else closes the menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-50 py-1 bg-[var(--color-base-100)] border-[var(--color-base-300)]"
          >
            <button
              onClick={(event) => !isProcessing && runAndClose(event, onEditExam)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-base-200)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-base-content)]"
            >
              Edit Exam
            </button>

            <button
              onClick={(event) =>
                canManageClasses && !isProcessing && runAndClose(event, onManageClasses)
              }
              disabled={!canManageClasses || isProcessing}
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-base-200)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-base-content)]"
            >
              Manage Classes
            </button>

            <button
              onClick={(event) =>
                canDelete && !isProcessing && runAndClose(event, onDelete)
              }
              disabled={!canDelete || isProcessing}
              title={!canDelete ? "Remove this exam from every class first" : undefined}
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-error)] hover:text-[var(--color-error-content)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-error)]"
            >
              Delete Exam
            </button>
          </div>
        </>
      )}
    </div>
  );
}