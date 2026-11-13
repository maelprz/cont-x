import { Fragment } from "react";
import { Flag } from "lucide-react";
import type { QuestionMapItem } from "../../screens/examQuestion/examQuestionScreen.types";

function statusStyle(
  status: QuestionMapItem["status"],
  isCurrent: boolean,
): string {
  if (isCurrent) return "bg-[#adc6ff] text-[#00285d] border-[#adc6ff]";
  if (status === "answered")
    return "bg-[#1c2b3c] text-[#d4e4fa] border-[#424754]";
  return "bg-transparent text-[#8c909f] border-[#424754]";
}

export function QuestionMapGrid({
  items,
  currentNumber,
  onNavigate,
}: {
  items: QuestionMapItem[];
  currentNumber: number;
  onNavigate?: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
      {items.map(({ number, status, flagged, sectionTitle, locked }, index) => (
        <Fragment key={number}>
          {/* a heading row whenever a new section starts (only exams with sections have these) */}
          {sectionTitle && sectionTitle !== items[index - 1]?.sectionTitle && (
            <p className="col-span-full mt-2 first:mt-0 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--text-inverted-secondary)] break-words">
              {sectionTitle}
            </p>
          )}
          <button
            type="button"
            aria-current={number === currentNumber ? "step" : undefined}
            aria-label={`Question ${number}, ${status}${flagged ? ", flagged" : ""}`}
            onClick={() => !locked && onNavigate?.(number)}
            disabled={locked}
            title={locked ? "Answer the earlier questions first" : undefined}
            className={`
              h-9 w-full min-w-0 p-0 rounded-lg border text-[12px] font-semibold font-mono
              transition-colors duration-150 relative
              ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              ${statusStyle(status, number === currentNumber)}
            `}
          >
            {number}
            {flagged && (
              <Flag size={12} aria-hidden="true" className="absolute -top-1 -right-1 fill-current text-[var(--warning-icon)]" />
            )}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
