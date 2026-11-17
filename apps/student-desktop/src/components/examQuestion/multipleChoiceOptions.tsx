import { Check, X } from "lucide-react";
import type { MCQOption } from "../../screens/examQuestion/examQuestionScreen.types";

interface MultipleChoiceOptionsProps {
  options: (MCQOption & { displayLetter?: string; isCorrect?: boolean | null })[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onClear?: () => void;
  className?: string;
}

export function MultipleChoiceOptions({ options, selectedId, onSelect, onClear, className = "mt-6" }: MultipleChoiceOptionsProps) {
  return (
    <div className={`flex flex-col gap-3 w-full min-w-0 ${className}`}>
      {options.map(({ id, text, displayLetter, isCorrect }, index) => {
        const selected = selectedId === id;
        const correct = !onSelect && isCorrect === true;
        const wrong = !onSelect && selected && isCorrect === false;
        const border = wrong ? "border-red-700 inset-ring-1 inset-ring-red-700"
          : selected || correct ? "border-green-700 inset-ring-1 inset-ring-green-700"
          : "border-stone-200";
        const classes = `flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border text-[#101828] ${wrong ? "bg-red-50" : correct ? "bg-green-50" : "bg-white"} ${border}`;
        const content = (
          <>
            <span className={`shrink-0 w-7 h-7 rounded-md border grid place-items-center text-xs font-semibold ${wrong ? "border-red-700 bg-red-700 text-white" : selected || correct ? "border-green-700 bg-green-700 text-white" : "border-stone-200 bg-stone-50 text-stone-500"}`}>
              {displayLetter ?? String.fromCharCode(65 + index)}
            </span>
            <span className="text-sm leading-relaxed min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">{text}</span>
            {!onSelect && (selected || correct) && (
              <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${wrong ? "text-red-700" : "text-green-800"}`}>
                {correct && <><Check size={18} aria-hidden="true" /><span className="sr-only">Correct answer</span></>}
                {wrong && <><X size={18} aria-hidden="true" /><span className="sr-only">Incorrect</span></>}
                {selected && "Your answer"}
              </span>
            )}
          </>
        );
        return onSelect ? (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(id)}
            className={`${classes} cursor-pointer transition-colors hover:border-green-700 focus:outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700`}
          >
            {content}
          </button>
        ) : <div key={id} className={classes}>{content}</div>;
      })}
      {selectedId && onClear && (
        <button type="button" onClick={onClear} className="self-end mt-1 text-[13px] font-semibold cursor-pointer text-[#00285d] hover:underline">
          Clear Choice
        </button>
      )}
    </div>
  );
}
