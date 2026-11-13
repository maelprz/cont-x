import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const minWidth = 25;
const maxWidth = 65;

export function QuestionAnswerSplit({ question, answer }: { question: ReactNode; answer: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [questionWidth, setQuestionWidth] = useState(46);

  function resize(width: number) {
    setQuestionWidth(Math.max(minWidth, Math.min(maxWidth, Math.round(width))));
  }

  return (
    <div
      ref={container}
      className="grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden bg-[var(--bg-app)] sm:grid-cols-[var(--exam-columns)] sm:grid-rows-[minmax(0,1fr)]"
      style={{ "--exam-columns": `minmax(0,${questionWidth}fr) 12px minmax(0,${100 - questionWidth}fr)` } as CSSProperties}
    >
      {question}
      <div
        role="separator"
        aria-label="Resize question pane"
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={questionWidth}
        aria-valuetext={`${questionWidth}% question pane`}
        tabIndex={0}
        className="group relative hidden cursor-col-resize touch-none select-none outline-offset-[-2px] sm:block"
        onPointerDown={(event) => {
          if (event.button === 0) event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = container.current?.getBoundingClientRect();
          if (bounds && bounds.width > 12) resize(((event.clientX - bounds.left - 6) / (bounds.width - 12)) * 100);
        }}
        onKeyDown={(event) => {
          switch (event.key) {
            case "ArrowLeft": resize(questionWidth - 3); break;
            case "ArrowRight": resize(questionWidth + 3); break;
            case "Home": resize(minWidth); break;
            case "End": resize(maxWidth); break;
            default: return;
          }
          event.preventDefault();
        }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--border-primary)] group-hover:bg-[var(--text-primary)]" />
        <span className="absolute left-1/2 top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--border-primary)] group-hover:bg-[var(--text-primary)]" />
      </div>
      {answer}
    </div>
  );
}
