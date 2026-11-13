import { Plus, X } from "lucide-react";
import type { FITBBuilderQuestion } from "../../screens/examBuilder/examBuilderScreen.types";

export function FITBEditorPanel({
  question,
  onChange,
  onPreviewRendered,
}: {
  question: FITBBuilderQuestion;
  onChange: (q: FITBBuilderQuestion) => void;
  onPreviewRendered?: () => void;
}) {
  const setTitle = (v: string) => onChange({ ...question, title: v });
  const setPoints = (v: string) => onChange({ ...question, points: Number(v) || 0 });
  const setDescription = (v: string) => onChange({ ...question, description: v });
  const setCaseSensitive = (v: boolean) => onChange({ ...question, caseSensitive: v });
  const setIgnoreExtraSpaces = (v: boolean) => onChange({ ...question, ignoreExtraSpaces: v });

  const setAnswerText = (id: string, text: string) =>
    onChange({
      ...question,
      acceptedAnswers: question.acceptedAnswers.map((a) => (a.id === id ? { ...a, text } : a)),
    });

  const addAnswer = () =>
    onChange({
      ...question,
      acceptedAnswers: [...question.acceptedAnswers, { id: crypto.randomUUID(), text: "" }],
    });

  // a question always keeps at least one answer row, so the list can't be emptied by accident
  const removeAnswer = (id: string) =>
    onChange({
      ...question,
      acceptedAnswers:
        question.acceptedAnswers.length > 1
          ? question.acceptedAnswers.filter((a) => a.id !== id)
          : question.acceptedAnswers,
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Title and Points row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[1_1_12rem]">
          <label
            className="block text-[13px] font-medium mb-2"
            style={{ color: "var(--color-base-content)" }}
          >
            Question Title
          </label>
          <input
            type="text"
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

        <div>
          <label
            className="block text-[13px] font-medium mb-2"
            style={{ color: "var(--color-base-content)" }}
          >
            Points
          </label>
          <input
            type="number"
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
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            Problem Description (Markdown)
          </label>
          {onPreviewRendered && <button
            type="button"
            onClick={onPreviewRendered}
            className="text-xs font-semibold cursor-pointer border-none bg-transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            Preview Rendered
          </button>}
        </div>
        <textarea
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none leading-relaxed"
          style={{
            backgroundColor: "var(--color-base-100)",
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
          }}
        />
      </div>

      {/* Accepted answers and how strictly they are matched */}
      <div>
        <p
          className="mb-3 text-[13px] font-medium"
          style={{ color: "var(--color-base-content)", opacity: 0.6 }}
        >
          Accepted Answers
        </p>
        <div className="flex flex-col gap-2.5">
          {question.acceptedAnswers.map((answer) => (
            <div
              key={answer.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor:
                  answer.text.trim() === "" ? "var(--color-error)" : "var(--color-base-300)",
              }}
            >
              <input
                type="text"
                value={answer.text}
                onChange={(e) => setAnswerText(answer.id, e.target.value)}
                placeholder="An answer that earns full points, e.g. PowerPoint"
                className="min-w-0 flex-1 border-none bg-transparent text-sm focus-visible:outline-2 focus-visible:outline-[#465a3b]"
                style={{ color: "var(--color-base-content)", fontFamily: "inherit" }}
              />
              <button
                onClick={() => removeAnswer(answer.id)}
                disabled={question.acceptedAnswers.length <= 1}
                className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-60 disabled:cursor-not-allowed"
                style={{
                  color: "var(--color-base-content)",
                  opacity: question.acceptedAnswers.length <= 1 ? 0.15 : 0.4,
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addAnswer}
          className="flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{
            borderColor: "var(--color-secondary)",
            color: "var(--color-secondary)",
            backgroundColor: "transparent",
          }}
        >
          <Plus size={14} />
          Add Accepted Answer
        </button>

        <div className="flex flex-col gap-2.5 mt-5">
          <label
            className="flex items-center gap-2.5 text-[13px] cursor-pointer"
            style={{ color: "var(--color-base-content)" }}
          >
            <input
              type="checkbox"
              checked={question.caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            Case sensitive (&quot;Stack&quot; and &quot;stack&quot; are different answers)
          </label>
          <label
            className="flex items-center gap-2.5 text-[13px] cursor-pointer"
            style={{ color: "var(--color-base-content)" }}
          >
            <input
              type="checkbox"
              checked={question.ignoreExtraSpaces}
              onChange={(e) => setIgnoreExtraSpaces(e.target.checked)}
            />
            Ignore extra spaces (leading, trailing and repeated spaces don&apos;t count)
          </label>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
          A student&apos;s answer is correct if it matches any one of the accepted answers. Graded all
          or nothing: full points for a match, zero otherwise.
        </p>
      </div>
    </div>
  );
}
