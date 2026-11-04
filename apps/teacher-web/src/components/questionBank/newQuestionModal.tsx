import type { QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";
// Small modal that asks which question type to create, instead of two separate buttons.
export function NewQuestionModal({
  isOpen,
  onClose,
  onSelectType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: QuestionType) => void;
}) {
  if (!isOpen) return null; // render nothing when modal is closed

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          New Question
        </h2>
        <p className="text-[13px] mb-5 opacity-60" style={{ color: "var(--color-base-content)" }}>
          Choose the type of question you want to create.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onSelectType("multiple-choice")}
            className="px-4 py-3 rounded-lg border text-left text-[14px] font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-200)" }}
          >
            Multiple Choice
          </button>
          <button
            onClick={() => onSelectType("coding")}
            className="px-4 py-3 rounded-lg border text-left text-[14px] font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-200)" }}
          >
            Coding Question
          </button>
          <button
            onClick={() => onSelectType("fill-in-the-blank")}
            className="px-4 py-3 rounded-lg border text-left text-[14px] font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-200)" }}
          >
            Fill in the Blank
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}