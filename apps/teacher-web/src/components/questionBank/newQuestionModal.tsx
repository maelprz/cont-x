import { CircleDot, Code2, TextCursorInput } from "lucide-react";
import type { QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";
import { ExamDialog, examSecondary } from "../examLibrary/examDialog";
import { questionTypeLabels } from "../examBuilder/createBlankQuestion";

const options = [
  { type: "multiple-choice", Icon: CircleDot },
  { type: "fill-in-the-blank", Icon: TextCursorInput },
  { type: "coding", Icon: Code2 },
] as const;

export function NewQuestionModal({ isOpen, onClose, onSelectType }: {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: QuestionType) => void;
}) {
  if (!isOpen) return null;

  return (
    <ExamDialog title="Choose question type" onClose={onClose} footer={
      <button type="button" className={examSecondary} onClick={onClose}>Cancel</button>
    }>
      <div className="grid gap-2">
        {options.map(({ type, Icon }) => (
          <button key={type} type="button" className={`${examSecondary} justify-start`} onClick={() => onSelectType(type)}>
            <Icon size={16} aria-hidden="true" /> {questionTypeLabels[type]}
          </button>
        ))}
      </div>
    </ExamDialog>
  );
}
