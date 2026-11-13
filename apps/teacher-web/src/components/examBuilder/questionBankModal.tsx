import { TeacherSelect } from "../shared/teacherSelect";
import { TeacherSwitch } from "../shared/teacherSwitch";
import { ExamDialog, examPrimary, examSecondary } from "../examLibrary/examDialog";
import { useState } from "react";
import { Search, Plus, Check } from "lucide-react";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { getBankQuestionById } from "../../services/questionBankService";
import { requireTopicIds } from "../../services/questionTopicService";
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
  const { questions: bankQuestions, isLoading, error: bankError } = useQuestionBank(
    isOpen ? subjectId : null, // don't load anything while the modal is closed
    includeShared,
  );

  const [search, setSearch] = useState(""); // filters the bank list by title
  // chosen questions, kept as summaries so a pick survives the list being re-filtered
  const [selected, setSelected] = useState<Map<string, BankQuestionSummary>>(new Map());
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "multiple-choice" | "coding" | "fill-in-the-blank">("all");
  const [activeTopicId, setActiveTopicId] = useState("");
  // what the teacher picked in "Add as" — null until they touch it, so the starting choice
  // (the pool this was opened from, or "Always included") is worked out below, not stored
  const [pickedDestination, setPickedDestination] = useState<string | null>(null);
  const [pickCount, setPickCount] = useState(1); // only used when making a new pool
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null; // render nothing when the modal is closed

  // SPECIFIED | NEW_POOL | `pool:<id>`
  const destination = pickedDestination ?? (defaultPoolId ? `pool:${defaultPoolId}` : SPECIFIED);

  const resetAndClose = () => {
    setSearch("");
    setSelected(new Map());
    setSubmitError(null);
    setActiveTypeFilter("all");
    setActiveTopicId("");
    setIncludeShared(false);
    setPickCount(1);
    setPickedDestination(null);
    onClose();
  };

  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeTypeFilter === "all" || q.type === activeTypeFilter;
    const matchesTopic = !activeTopicId || q.topics.some((topic) => topic.id === activeTopicId);
    return matchesSearch && matchesType && matchesTopic;
  });

  const toggleSelected = (question: BankQuestionSummary) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.set(question.id, question);
      return next;
    });
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
    questions.map((q) => ({ bankQuestionId: q.id, title: q.title, type: q.type, points: q.points, topics: q.topics }));

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
          const topicIds = requireTopicIds(bankQuestion.topicIds);
          newExamQuestions.push({
            ...bankQuestion,
            id: crypto.randomUUID(), // fresh id — independent copy, not yet saved anywhere
            sourceBankQuestionId: idsArray[i],
            topicIds,
            number: startingNumber + i + 1,
            // Each independent copy owns its child rows, even when reused again.
            ...(bankQuestion.type === "multiple-choice"
              ? { options: bankQuestion.options.map((option) => ({ ...option, id: crypto.randomUUID() })) }
              : {}),
            ...(bankQuestion.type === "coding"
              ? { testCases: bankQuestion.testCases.map((testCase) => ({ ...testCase, id: crypto.randomUUID() })) }
              : {}),
            ...(bankQuestion.type === "fill-in-the-blank"
              ? {
                  acceptedAnswers: bankQuestion.acceptedAnswers.map((a) => ({
                    ...a,
                    id: crypto.randomUUID(),
                  })),
                }
              : {}),
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
    <ExamDialog title="Add from Question Bank" wide busy={isSubmitting} onClose={resetAndClose} footer={<>
      <div className="mr-auto flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="picker-destination" className="text-[12px] opacity-60 font-medium whitespace-nowrap">Add as</label>
          <TeacherSelect
            id="picker-destination"
            label="Add as"
            value={destination}
            onChange={setPickedDestination}
            className="w-52 max-w-full"
            options={[{ value: SPECIFIED, label: "Always included" }, { value: NEW_POOL, label: "New random pool" },
              ...pools.map((pool) => ({ value: `pool:${pool.id}`, label: `Pool: ${pool.title.trim() || "Untitled pool"}` }))]}
          />

          {isNewPool && (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="opacity-60">pick</span>
              <input
                aria-label="Questions to pick"
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
      <div className="flex flex-wrap gap-2">
        <button type="button" className={examSecondary} onClick={resetAndClose} disabled={isSubmitting}>Cancel</button>
        <button type="button" className={examPrimary} onClick={handleSubmit} disabled={!canSubmit}>{submitLabel}</button>
      </div>
    </>}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 border-[var(--color-base-300)] bg-[var(--color-base-200)]">
          <Search size={13} style={{ opacity: 0.5 }} />
          <input
            type="text"
            aria-label="Search bank questions"
            placeholder="Search bank questions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-sm focus-visible:outline-[#465a3b]"
            style={{ color: "var(--color-base-content)" }}
          />
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className={examSecondary}
          disabled={isSubmitting}
        >
          <Plus size={14} />
          Create New
        </button>
      </div>

      {/* Type filter — same control as the bank screen */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] opacity-60 font-medium">Type:</span>
        {(["all", "multiple-choice", "coding", "fill-in-the-blank"] as const).map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => setActiveTypeFilter(type)}
            className="px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer border transition-opacity hover:opacity-80"
            style={{
              borderColor: activeTypeFilter === type ? "var(--color-secondary)" : "var(--color-base-300)",
              backgroundColor: activeTypeFilter === type ? "var(--color-secondary)" : "transparent",
              color: activeTypeFilter === type ? "white" : "var(--color-base-content)",
            }}
          >
            {type === "all" ? "All" : type === "multiple-choice" ? "Multiple Choice" : type === "coding" ? "Coding" : "Fill in the Blank"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TeacherSelect
          label="Filter by subject topic"
          value={activeTopicId}
          onChange={setActiveTopicId}
          placeholder={activeTopicId ? "Selected topic" : "All topics"}
          className="w-44 max-w-full"
          options={[{ value: "", label: "All topics" }, ...[...new Map(bankQuestions.flatMap((q) => q.topics).map((topic) => [topic.id, topic])).values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((topic) => ({ value: topic.id, label: topic.name }))]}
        />
        <TeacherSwitch label="Include questions shared from other subjects" checked={includeShared} onChange={setIncludeShared} />
      </div>

      {isLoading && <p className="text-[13px] opacity-60">Loading question bank...</p>}
      {bankError && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{bankError}</p>}

      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {filteredBankQuestions.map((q) => {
          const isSelected = selected.has(q.id);
          return (
            <button
              type="button"
              key={q.id}
              aria-pressed={isSelected}
              disabled={isSubmitting || q.topics.length === 0}
              onClick={() => toggleSelected(q)}
              className={`flex w-full items-center gap-3 px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#465a3b] disabled:opacity-60 ${isSelected ? "bg-[#edf1e8]" : "hover:bg-stone-100"}`}
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
              <div className="min-w-0 flex-1 break-words">
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
                  {q.type === "multiple-choice" ? "Multiple Choice" : q.type === "coding" ? "Coding" : "Fill in the Blank"} • {q.points} pts
                </p>
                {q.topics.length > 0 && <p className="mt-1 text-[11px] text-[var(--color-base-content)]/60">
                  {q.topics.map((topic) => topic.name).join(", ")}
                </p>}
                {q.topics.length === 0 && <p className="mt-1 text-xs text-[var(--color-error)]">
                  {q.isOwn ? "Assign topics in Question Bank before reusing this question." : "The owner must assign topics before this question can be reused."}
                </p>}
              </div>
            </button>
          );
        })}
        {!isLoading && filteredBankQuestions.length === 0 && (
          <p className="text-[13px] opacity-50 text-center py-6">No bank questions match your search.</p>
        )}
      </div>

      {submitError && <p role="alert" className="text-[13px] mt-3" style={{ color: "var(--color-error)" }}>{submitError}</p>}
    </ExamDialog>
  );
}
