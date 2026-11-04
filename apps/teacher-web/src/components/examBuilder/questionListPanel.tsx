import { Plus } from "lucide-react";
import { CircleDot, Code2, Shuffle, TextCursorInput } from "lucide-react";
import type { BuilderPool, BuilderQuestion, QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";

function typeLabel(type: QuestionType) {
  if (type === "multiple-choice") return "Multiple Choice";
  if (type === "fill-in-the-blank") return "Fill in the Blank";
  return "Coding";
}

function QuestionListItem({
  question,
  isActive,
  onClick,
}: {
  question: BuilderQuestion;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border rounded-xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: isActive ? "var(--color-base-100)" : "transparent",
        borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)",
        outline: "none",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-widest"
          style={{
            color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
            opacity: isActive ? 1 : 0.5,
          }}
        >
          Question {question.number}
        </p>
        {question.type === "coding" ? (
          <Code2 size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        ) : question.type === "fill-in-the-blank" ? (
          <TextCursorInput size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        ) : (
          <CircleDot size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        )}
      </div>
      <p className="text-[14px] font-semibold leading-snug mb-0.5" style={{ color: "var(--color-base-content)" }}>
        {question.title}
      </p>
      <p
        className="text-[12px]"
        style={{
          color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
          opacity: isActive ? 1 : 0.5,
        }}
      >
        {typeLabel(question.type)} • {question.points} pts
      </p>
    </button>
  );
}

// one random "pick N of M" pool in the list
function PoolListItem({
  pool,
  isActive,
  onClick,
}: {
  pool: BuilderPool;
  isActive: boolean;
  onClick: () => void;
}) {
  const accent = isActive ? "var(--color-secondary)" : "var(--color-base-content)";
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border rounded-xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: isActive ? "var(--color-base-100)" : "transparent",
        borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)",
        outline: "none",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: accent, opacity: isActive ? 1 : 0.5 }}
        >
          Random pool
        </p>
        <Shuffle size={14} style={{ color: accent, opacity: isActive ? 1 : 0.4 }} />
      </div>
      <p className="text-[14px] font-semibold leading-snug mb-0.5" style={{ color: "var(--color-base-content)" }}>
        {pool.title.trim() || "Untitled pool"}
      </p>
      <p className="text-[12px]" style={{ color: accent, opacity: isActive ? 1 : 0.5 }}>
        Pick {pool.pickCount} of {pool.items.length}
      </p>
    </button>
  );
}

export function QuestionListPanel({
  questions,
  activeId,
  onSelectQuestion,
  onAddQuestion,
  hideAddButton = false,
  pools = [],
  activePoolId = null,
  onSelectPool,
}: {
  questions: BuilderQuestion[];
  activeId: string;
  onSelectQuestion: (id: string) => void;
  pools?: BuilderPool[];
  activePoolId?: string | null;
  onSelectPool?: (id: string) => void;
  onAddQuestion?: () => void;
  onReorderQuestions?: () => void;
  hideAddButton?: boolean;
}) {
  return (
    <aside
      className="w-[260px] flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)" }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-base-300)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--color-base-content)" }}>
          Questions
        </h2>
        {!hideAddButton && (
          <button
            onClick={onAddQuestion}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {questions.map((q) => (
          <QuestionListItem
            key={q.id}
            question={q}
            isActive={q.id === activeId}
            onClick={() => onSelectQuestion(q.id)}
          />
        ))}

        {pools.length > 0 && (
          <>
            <p
              className="font-mono text-[10px] font-semibold uppercase tracking-widest mt-3 mb-1 px-1"
              style={{ color: "var(--color-base-content)", opacity: 0.5 }}
            >
              Random pools
            </p>
            {pools.map((pool) => (
              <PoolListItem
                key={pool.id}
                pool={pool}
                isActive={pool.id === activePoolId}
                onClick={() => onSelectPool?.(pool.id)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}