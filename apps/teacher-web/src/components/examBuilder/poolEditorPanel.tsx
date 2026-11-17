import { Trash2, Plus, CircleDot, Code2, TextCursorInput, X } from "lucide-react";
import { Pagination } from "../shared/pagination";
import { usePagination } from "../../hooks/usePagination";
import type { BuilderPool } from "../../screens/examBuilder/examBuilderScreen.types";

// Edits how many questions students draw and which bank questions they can draw.
export function PoolEditorPanel({
  pool,
  readOnly,
  onChange,
  onDelete,
  onAddQuestions,
}: {
  pool: BuilderPool;
  readOnly: boolean; // true while editing an exam that's live in a class — structure can't change
  onChange: (pool: BuilderPool) => void;
  onDelete: () => void;
  onAddQuestions: () => void;
}) {
  const itemCount = pool.items.length;
  const page = usePagination(pool.items, 10, pool.id);
  const pointValues = new Set(pool.items.map((item) => item.points));

  const inputClass =
    "px-3 py-2 rounded-lg border text-[13px] outline-none bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] disabled:opacity-60";

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {readOnly && (
        <p className="text-[13px] px-4 py-3 rounded-lg bg-[var(--color-base-200)] text-[var(--color-base-content)]">
          This exam is live in a class, so its random pools can't be changed right now.
        </p>
      )}

      <div>
        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">Pool name</label>
        <input
          type="text"
          value={pool.title}
          disabled={readOnly}
          onChange={(e) => onChange({ ...pool, title: e.target.value })}
          placeholder="e.g. Loops — pick one"
          className={`w-full ${inputClass}`}
        />
      </div>

      <label className="w-fit text-[13px] font-medium text-[var(--color-base-content)]">
        Questions each student gets
        <span className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(itemCount, 1)}
            value={pool.pickCount}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                ...pool,
                pickCount: Math.min(Math.max(1, Math.trunc(Number(e.target.value)) || 1), Math.max(itemCount, 1)),
              })
            }
            className={`w-20 ${inputClass}`}
          />
          <span className="font-normal opacity-70">of {itemCount}</span>
        </span>
      </label>

      {!readOnly && pool.pickCount < itemCount && pointValues.size > 1 && (
        <p className="text-[12px] px-3 py-2 rounded-lg border border-[var(--color-base-300)] text-[var(--color-base-content)]">
          This pool has questions worth different points. The total can vary depending on which questions a student draws.
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-[var(--color-base-content)]">
            Questions in this pool ({itemCount})
          </p>
          {!readOnly && (
            <button
              onClick={onAddQuestions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)]"
            >
              <Plus size={13} />
              Add by type and topic
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {page.items.map((item) => (
            <div
              key={item.bankQuestionId}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[var(--color-base-300)]"
            >
              {item.type === "coding" ? (
                <Code2 size={14} style={{ opacity: 0.5 }} />
              ) : item.type === "fill-in-the-blank" ? (
                <TextCursorInput size={14} style={{ opacity: 0.5 }} />
              ) : (
                <CircleDot size={14} style={{ opacity: 0.5 }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate text-[var(--color-base-content)]">{item.title}</p>
                <p className="text-[12px] opacity-60 text-[var(--color-base-content)]">
                  {item.type === "coding" ? "Coding" : item.type === "fill-in-the-blank" ? "Fill in the Blank" : "Multiple Choice"} • {item.points} pts
                </p>
                {(item.topics?.length ?? 0) > 0 && <p className="mt-1 text-xs text-[var(--color-base-content)]/60">
                  {item.topics!.map((topic) => topic.name).join(", ")}
                </p>}
              </div>
              {!readOnly && (
                <button
                  onClick={() =>
                    onChange({
                      ...pool,
                      items: pool.items.filter((i) => i.bankQuestionId !== item.bankQuestionId),
                      // keep "pick N" valid as the pool shrinks
                      pickCount: Math.min(pool.pickCount, Math.max(pool.items.length - 1, 1)),
                    })
                  }
                  title="Remove from pool"
                  className="cursor-pointer border-none bg-transparent p-1 opacity-60 hover:opacity-100 text-[var(--color-base-content)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {itemCount === 0 && (
            <p className="text-[13px] opacity-60 text-[var(--color-base-content)]">
              Nothing in this pool yet. Add questions from the bank.
            </p>
          )}
        </div>
        <Pagination label="Random pool question pages" {...page} />
      </div>

      {!readOnly && (
        <div className="pt-4 border-t border-[var(--color-base-300)]">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
            style={{ color: "var(--color-error)" }}
          >
            <Trash2 size={14} />
            Delete pool
          </button>
        </div>
      )}
    </div>
  );
}
