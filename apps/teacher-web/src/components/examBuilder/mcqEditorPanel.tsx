import { Plus, X, CircleDot, Circle } from "lucide-react";
import type { MCQBuilderQuestion } from "../../screens/examBuilder/examBuilderScreen.types";

export function MCQEditorPanel({
  question,
  onChange,
  onPreviewRendered,
}: {
  question: MCQBuilderQuestion;
  onChange: (q: MCQBuilderQuestion) => void;
  onPreviewRendered?: () => void;
}) {
  // updates the question's title text
  const setTitle = (v: string) => onChange({ ...question, title: v });
  const setPoints = (v: string) => onChange({ ...question, points: Number(v) || 0 });
  const setDescription = (v: string) => onChange({ ...question, description: v });

  const setCorrect = (id: string) =>
    onChange({ ...question, options: question.options.map((o) => ({ ...o, isCorrect: o.id === id })) });

  const setOptionText = (id: string, text: string) =>
    onChange({ ...question, options: question.options.map((o) => (o.id === id ? { ...o, text } : o)) });

  const removeOption = (id: string) =>
    onChange({ ...question, options: question.options.filter((o) => o.id !== id) });

  const addOption = () =>
    onChange({ ...question, options: [...question.options, { id: crypto.randomUUID(), text: "", isCorrect: false }] });
  
  return (
    <div className="flex flex-col gap-4">
      {/* Title and Points row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Editable question title */}
          <div className="min-w-0 flex-[1_1_12rem]">
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Question Title
            </label>
            <input
              type="text"
              aria-label="Question title"
              value={question.title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
                color: "var(--color-base-content)",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Points */}
          <div>
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Points
            </label>
            <input
              type="number"
              aria-label="Points"
              value={question.points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-24 rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
                color: "var(--color-base-content)",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

      {/* Problem description */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="text-[13px] font-medium">
            Prompt (Markdown)
          </label>
          <button onClick={onPreviewRendered} className="text-xs font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-secondary)" }}>
            Preview Rendered
          </button>
        </div>
        <textarea
          aria-label="Prompt (Markdown)"
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none leading-relaxed"
          style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)" }}
        />
      </div>

      {/* Options */}
      <div>
        <p className="mb-3 text-[13px] font-medium">
          Answer options
        </p>
        <div className="flex flex-col gap-2.5">
          {question.options.map((opt, index) => (
            <div
              key={opt.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2"
              style={{
                backgroundColor: opt.isCorrect ? "var(--color-base-200)" : "var(--color-base-100)",
                borderColor: opt.isCorrect ? "var(--color-secondary)" : "var(--color-base-300)",
              }}
            >
              <button type="button" aria-label={`Mark option ${index + 1} correct`} aria-pressed={opt.isCorrect} onClick={() => setCorrect(opt.id)} className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0">
                {opt.isCorrect
                  ? <CircleDot size={20} style={{ color: "var(--color-secondary)" }} />
                  : <Circle size={20} style={{ color: "var(--color-base-content)", opacity: 0.35 }} />}
              </button>
              <input
                type="text"
                aria-label={`Answer option ${index + 1}`}
                value={opt.text}
                onChange={(e) => setOptionText(opt.id, e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-sm focus-visible:outline-2 focus-visible:outline-[#465a3b]"
                style={{ color: "var(--color-base-content)", fontFamily: "inherit" }}
              />
              {opt.isCorrect && (
                <span className="text-xs font-semibold" style={{ color: "var(--color-secondary)" }}>
                  Correct
                </span>
              )}
              <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(opt.id)} className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-60" style={{ color: "var(--color-base-content)", opacity: 0.4 }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          className="flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--color-secondary)", color: "var(--color-secondary)", backgroundColor: "transparent" }}
        >
          <Plus size={14} />
          Add Option
        </button>
      </div>
    </div>
  );
}
