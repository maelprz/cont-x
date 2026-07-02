import { Plus } from "lucide-react";
import { CircleDot, Code2 } from "lucide-react";
import type { BuilderQuestion, QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";

function typeLabel(type: QuestionType) {
  return type === "multiple-choice" ? "Multiple Choice" : "Coding";
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

export function QuestionListPanel({
  questions,
  activeId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
}: {
  questions: BuilderQuestion[];
  activeId: string;
  onSelectQuestion: (id: string) => void;
  onAddQuestion?: () => void;
  onReorderQuestions?: () => void;
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
        <button
          onClick={onAddQuestion}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
        >
          <Plus size={15} />
        </button>
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
      </div>

      {/* Reorder */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "var(--color-base-300)" }}>
        <button
          onClick={onReorderQuestions}
          className="w-full py-2.5 rounded-xl border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent", opacity: 0.7 }}
        >
          Reorder Questions
        </button>
      </div>
    </aside>
  );
}