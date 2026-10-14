import { useState, useEffect } from "react";
import { Search, Plus, Check, Tag as TagIcon } from "lucide-react";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { getBankQuestionById } from "../../services/questionBankService";
import type { BankQuestionSummary } from "../../services/questionBankService";
import type {
  BuilderPool,
  BuilderQuestion,
  PoolItem,
  QuestionType,
} from "../../screens/examBuilder/examBuilderScreen.types";

// where the picked questions go: a brand-new random pool, or one that exists already
export type PoolTarget = { kind: "new"; pickCount: number } | { kind: "existing"; poolId: string };

const SPECIFIED = "specified";
const NEW_POOL = "new-pool";

export function QuestionBankModal({
  isOpen,
  subjectId,
  startingNumber,
  pools,
  defaultPoolId,
  onClose,
  onQuestionsAdded,
  onPoolItemsAdded,
  onCreateNewQuestion,
}: {
  isOpen: boolean;
  subjectId: string | null; // the exam's subject — the picker only lists that subject's bank
  startingNumber: number; // how many questions the exam already has, for numbering new ones
  pools: BuilderPool[]; // the exam's existing random pools, as places to add to
  defaultPoolId?: string | null; // opens with this pool preselected (from "Add from bank" inside a pool)
  onClose: () => void;
  onQuestionsAdded: (questions: BuilderQuestion[]) => void; // "always included" — unsaved copies, parent stages them locally
  onPoolItemsAdded: (target: PoolTarget, items: PoolItem[]) => void; // random pool — references, not copies
  onCreateNewQuestion: (type: QuestionType) => void; // hands off to the exam builder's own editor
}) {
  // widens the list to questions shared from other subjects (account/department level)
  const [includeShared, setIncludeShared] = useState(false);
  const { questions: bankQuestions, tags, isLoading, error: bankError } = useQuestionBank(
    isOpen ? subjectId : null, // don't load anything while the modal is closed
    includeShared,
  );

  const [search, setSearch] = useState(""); // filters the bank list by title
  // chosen questions, kept as summaries so a pick survives the list being re-filtered
  const [selected, setSelected] = useState<Map<string, BankQuestionSummary>>(new Map());
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "multiple-choice" | "coding">("all");
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [destination, setDestination] = useState<string>(SPECIFIED); // SPECIFIED | NEW_POOL | `pool:<id>`
  const [pickCount, setPickCount] = useState(1); // only used when making a new pool
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // each time the modal opens, start on the right destination
  useEffect(() => {
    if (isOpen) setDestination(defaultPoolId ? `pool:${defaultPoolId}` : SPECIFIED);
  }, [isOpen, defaultPoolId]);

  if (!isOpen) return null; // render nothing when the modal is closed

  const resetAndClose = () => {
    setSearch("");
    setSelected(new Map());
    setSubmitError(null);
    setActiveTypeFilter("all");
    setActiveTagIds([]);
    setIncludeShared(false);
    setPickCount(1);
    setDestination(SPECIFIED);
    onClose();
  };

  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeTypeFilter === "all" || q.type === activeTypeFilter;
    const matchesTags =
      activeTagIds.length === 0 || activeTagIds.every((tagId) => q.tags.some((t) => t.id === tagId));
    return matchesSearch && matchesType && matchesTags;
  });

  const toggleSelected = (question: BankQuestionSummary) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.set(question.id, question);
      return next;
    });
  };

  const toggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  // opens a blank MCQ directly in the main editor — no type prompt anymore
  const handleCreateNew = () => {
    onCreateNewQuestion("multiple-choice");
    resetAndClose();
  };

  const targetPool = destination.startsWith("pool:")
    ? pools.find((p) => p.id === destination.slice("pool:".length)) ?? null
    : null;
  // questions already in the chosen pool are skipped rather than added twice
  const addableForPool = targetPool
    ? [...selected.values()].filter((q) => !targetPool.items.some((i) => i.bankQuestionId === q.id))
    : [];

  const isNewPool = destination === NEW_POOL;
  const isSpecified = destination === SPECIFIED;
  const validPick = pickCount >= 1 && pickCount <= selected.size;

  const canSubmit =
    !isSubmitting &&
    (isSpecified
      ? selected.size > 0
      : isNewPool
        ? selected.size >= 2 && validPick
        : addableForPool.length > 0);

  const toPoolItems = (questions: BankQuestionSummary[]): PoolItem[] =>
    questions.map((q) => ({ bankQuestionId: q.id, title: q.title, type: q.type, points: q.points }));

  // "always included" builds local, unsaved copies — nothing is written to the database here.
  // Pools just record which bank questions are in the running; Save Draft/Exam persists them.
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isSpecified) {
        const idsArray = Array.from(selected.keys());
        const newExamQuestions: BuilderQuestion[] = [];

        for (let i = 0; i < idsArray.length; i++) {
          const bankQuestion = await getBankQuestionById(idsArray[i]); // read-only fetch, nothing persisted
          newExamQuestions.push({
            ...bankQuestion,
            id: crypto.randomUUID(), // fresh id — independent copy, not yet saved anywhere
            number: startingNumber + i + 1,
          });
        }
        onQuestionsAdded(newExamQuestions);
      } else if (isNewPool) {
        onPoolItemsAdded({ kind: "new", pickCount }, toPoolItems([...selected.values()]));
      } else if (targetPool) {
        onPoolItemsAdded({ kind: "existing", poolId: targetPool.id }, toPoolItems(addableForPool));
      }
      resetAndClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not load these questions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting
    ? "Adding..."
    : isSpecified
      ? `Add Selected (${selected.size})`
      : isNewPool
        ? `Create Pool (${selected.size})`
        : `Add to Pool (${addableForPool.length})`;

  return (
    <div
      onClick={resetAndClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] max-h-[80vh] flex flex-col rounded-xl border overflow-hidden bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--color-base-300)" }}>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--color-base-content)" }}>
            Add from Question Bank
          </h2>
          <button onClick={resetAndClose} className="cursor-pointer border-none bg-transparent text-[13px] opacity-60 hover:opacity-100" style={{ color: "var(--color-base-content)" }}>
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 border-[var(--color-base-300)] bg-[var(--color-base-200)]">
              <Search size={13} style={{ opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Search bank questions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-grow text-[13px] outline-none bg-transparent border-none"
                style={{ color: "var(--color-base-content)" }}
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
            >
              <Plus size={14} />
              Create New
            </button>
          </div>

          {/* Type filter — same control as the bank screen */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] opacity-60 font-medium">Type:</span>
            {(["all", "multiple-choice", "coding"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className="px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer border transition-opacity hover:opacity-80"
                style={{
                  borderColor: activeTypeFilter === type ? "var(--color-secondary)" : "var(--color-base-300)",
                  backgroundColor: activeTypeFilter === type ? "var(--color-secondary)" : "transparent",
                  color: activeTypeFilter === type ? "white" : "var(--color-base-content)",
                }}
              >
                {type === "all" ? "All" : type === "multiple-choice" ? "Multiple Choice" : "Coding"}
              </button>
            ))}
          </div>

          {/* Tag filter — same control as the bank screen */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <TagIcon size={13} style={{ opacity: 0.5 }} />
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className="px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer border transition-opacity hover:opacity-80"
                  style={{
                    borderColor: activeTagIds.includes(tag.id) ? "var(--color-secondary)" : "var(--color-base-300)",
                    backgroundColor: activeTagIds.includes(tag.id) ? "var(--color-secondary)" : "transparent",
                    color: activeTagIds.includes(tag.id) ? "white" : "var(--color-base-content)",
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 mb-4 cursor-pointer text-[12px] opacity-80">
            <input
              type="checkbox"
              checked={includeShared}
              onChange={(e) => setIncludeShared(e.target.checked)}
            />
            Also show questions shared with me from other subjects
          </label>

          {isLoading && <p className="text-[13px] opacity-60">Loading question bank...</p>}
          {bankError && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{bankError}</p>}

          <div className="flex flex-col gap-2">
            {filteredBankQuestions.map((q) => {
              const isSelected = selected.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => toggleSelected(q)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-colors"
                  style={{
                    borderColor: isSelected ? "var(--color-secondary)" : "var(--color-base-300)",
                    backgroundColor: isSelected ? "var(--color-base-200)" : "transparent",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: isSelected ? "var(--color-secondary)" : "var(--color-base-300)",
                      backgroundColor: isSelected ? "var(--color-secondary)" : "transparent",
                    }}
                  >
                    {isSelected && <Check size={13} color="white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium" style={{ color: "var(--color-base-content)" }}>
                      {q.title}
                      {!q.isOwn && (
                        <span
                          className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide align-middle"
                          style={{ backgroundColor: "var(--color-base-300)" }}
                        >
                          Shared
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] opacity-60" style={{ color: "var(--color-base-content)" }}>
                      {q.type === "multiple-choice" ? "Multiple Choice" : "Coding"} • {q.points} pts
                    </p>
                  </div>
                </button>
              );
            })}
            {!isLoading && filteredBankQuestions.length === 0 && (
              <p className="text-[13px] opacity-50 text-center py-6">No bank questions match your search.</p>
            )}
          </div>

          {submitError && <p className="text-[13px] mt-3" style={{ color: "var(--color-error)" }}>{submitError}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--color-base-300)" }}>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <label className="text-[12px] opacity-60 font-medium whitespace-nowrap">Add as</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="px-2 py-1.5 rounded-lg border text-[13px] outline-none bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] max-w-[220px]"
              >
                <option value={SPECIFIED}>Always included</option>
                <option value={NEW_POOL}>New random pool</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={`pool:${pool.id}`}>
                    Pool: {pool.title.trim() || "Untitled pool"}
                  </option>
                ))}
              </select>

              {isNewPool && (
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className="opacity-60">pick</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(selected.size, 1)}
                    value={pickCount}
                    onChange={(e) => setPickCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 px-2 py-1.5 rounded-lg border text-[13px] outline-none bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                  />
                  <span className="opacity-60">of {selected.size}</span>
                </div>
              )}
            </div>
            {isNewPool && selected.size < 2 && (
              <p className="text-[11px] opacity-60">A random pool needs at least 2 questions.</p>
            )}
            {isNewPool && selected.size >= 2 && !validPick && (
              <p className="text-[11px]" style={{ color: "var(--color-error)" }}>
                Pick a number between 1 and {selected.size}.
              </p>
            )}
            {targetPool && selected.size > addableForPool.length && (
              <p className="text-[11px] opacity-60">
                {selected.size - addableForPool.length} already in this pool, skipped.
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}