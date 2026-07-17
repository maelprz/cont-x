import { useState } from "react";
import { MoreVertical } from "lucide-react";
import type { ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";

type ExamCardMenuProps = {
  status: ExamStatus;
  isProcessing: boolean;
  onPublish: () => void;
  onEnd: () => void;
  onDelete: () => void;
  onEditSettings: () => void; // opens the Edit Settings modal
  onEditExam: () => void; // opens Exam Builder, only shown while active
};

export function ExamCardMenu({
  status,
  isProcessing,
  onPublish,
  onEnd,
  onDelete,
  onEditSettings,
  onEditExam,
}: ExamCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false); // whether the dropdown is showing

  // exams already live can only be ended, everything earlier can only be published
  const isActive = status === "active";
  const canPublishOrEnd = status === "draft" || status === "saved" || status === "active";
  const canDelete = status === "draft" || status === "saved"; // never published yet

  // one button does double duty — label and action both depend on status
  const publishOrEndLabel = isActive ? "End Exam" : "Publish Exam";
  const publishOrEndAction = isActive ? onEnd : onPublish;

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
            className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-lg z-50 py-1 bg-[var(--color-base-100)] border-[var(--color-base-300)]"
          >
            <button
              onClick={(event) => !isProcessing && runAndClose(event, onEditSettings)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-base-200)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-base-content)]"
            >
              Edit Settings
            </button>

            {/* only shown while the exam is live, lets a teacher fix mistakes mid-exam */}
            {isActive && (
              <button
                onClick={(event) => !isProcessing && runAndClose(event, onEditExam)}
                disabled={isProcessing}
                className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-base-200)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-base-content)]"
              >
                Edit Exam
              </button>
            )}

            <button
              onClick={(event) =>
                canPublishOrEnd && !isProcessing && runAndClose(event, publishOrEndAction)
              }
              disabled={!canPublishOrEnd || isProcessing}
              className="w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-[var(--color-base-200)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-base-content)]"
            >
              {publishOrEndLabel}
            </button>

            <button
              onClick={(event) =>
                canDelete && !isProcessing && runAndClose(event, onDelete)
              }
              disabled={!canDelete || isProcessing}
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