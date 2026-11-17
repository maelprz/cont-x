import { useRef, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { QuestionBankFilters } from "../questionBank/questionBankFilters";
import { TeacherSelect } from "../shared/teacherSelect";
import { ExamDialog, examField, examPrimary, examSecondary } from "../examLibrary/examDialog";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { getBankQuestionById, type BankQuestionSummary } from "../../services/questionBankService";
import { requireTopicIds } from "../../services/questionTopicService";
import { questionTypeLabels } from "./createBlankQuestion";
import type {
  BuilderPool,
  BuilderQuestion,
  PoolItem,
  QuestionType,
} from "../../screens/examBuilder/examBuilderScreen.types";

export type PoolTarget = { kind: "new"; pickCount: number } | { kind: "existing"; poolId: string };

const SPECIFIED = "specified";
const NEW_POOL = "new-pool";
const PAGE_SIZE = 8;
const typeOptions = (Object.keys(questionTypeLabels) as QuestionType[])
  .map((value) => ({ value, label: questionTypeLabels[value] }));

function getTopicOptions(questions: BankQuestionSummary[], selectedTopics: Map<string, string>) {
  const topics = new Map(questions.flatMap((question) => question.topics).map((topic) => [topic.id, topic.name]));
  for (const [id, name] of selectedTopics) {
    if (!topics.has(id)) topics.set(id, name);
  }
  return [...topics].sort(([, a], [, b]) => a.localeCompare(b));
}

export function QuestionBankModal({
  subjectId,
  startingNumber,
  examQuestions,
  pools,
  defaultPoolId,
  onClose,
  onQuestionsAdded,
  onPoolItemsAdded,
  onCreateNewQuestion,
}: {
  subjectId: string | null;
  startingNumber: number;
  examQuestions: BuilderQuestion[];
  pools: BuilderPool[];
  defaultPoolId: string | null;
  onClose: () => void;
  onQuestionsAdded: (questions: BuilderQuestion[]) => void;
  onPoolItemsAdded: (target: PoolTarget, items: PoolItem[]) => void;
  onCreateNewQuestion: (type: QuestionType) => void;
}) {
  const [includeShared, setIncludeShared] = useState(false);
  const { questions, isLoading, error: bankError, refetch } = useQuestionBank(subjectId, includeShared);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, BankQuestionSummary>>(new Map());
  const [typeFilter, setTypeFilter] = useState<"all" | QuestionType>("all");
  const [topicFilter, setTopicFilter] = useState<{ id: string; name: string } | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const questionList = useRef<HTMLDivElement>(null);
  const [destination, setDestination] = useState(defaultPoolId ? `pool:${defaultPoolId}` : SPECIFIED);
  const [poolType, setPoolType] = useState<QuestionType | null>(null);
  const [poolTopics, setPoolTopics] = useState<Map<string, string>>(new Map());
  const [pickCount, setPickCount] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSpecified = destination === SPECIFIED;
  const isNewPool = destination === NEW_POOL;
  const targetPool = pools.find((pool) => `pool:${pool.id}` === destination);
  const pooledIds = new Set(pools.flatMap((pool) => pool.items.map((item) => item.bankQuestionId)));
  const fixedSourceIds = new Set(examQuestions.map((question) => question.sourceBankQuestionId));
  const questionKey = (type: QuestionType, title: string, prompt: string) => JSON.stringify([type, title.trim(), prompt.trim()]);
  // Copies saved before source IDs were recorded can still match by unchanged content.
  const legacyFixedKeys = new Set(examQuestions.filter((question) => !question.sourceBankQuestionId)
    .map((question) => questionKey(question.type, question.title, question.description)));

  const query = search.trim().toLowerCase();
  const filteredQuestions = isSpecified ? questions.filter((question) =>
    question.title.toLowerCase().includes(query) &&
    (typeFilter === "all" || question.type === typeFilter) &&
    (!topicFilter || question.topics.some((topic) => topic.id === topicFilter.id)),
  ) : [];
  const topicOptions = isSpecified
    ? getTopicOptions(questions, new Map(topicFilter ? [[topicFilter.id, topicFilter.name]] : []))
    : [];
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const pageStart = (page - 1) * PAGE_SIZE;

  const matchingType = !isSpecified && poolType ? questions.filter((question) => question.type === poolType) : [];
  const poolTopicOptions = getTopicOptions(matchingType, poolTopics);
  const existingIds = new Set(targetPool?.items.map((item) => item.bankQuestionId));
  const topicMatches = matchingType.filter((question) => question.topics.some((topic) => poolTopics.has(topic.id)));
  const candidates = topicMatches.filter((question) => !existingIds.has(question.id) &&
    !fixedSourceIds.has(question.id) && !legacyFixedKeys.has(questionKey(question.type, question.title, question.prompt)));
  const excludedCount = topicMatches.length - candidates.length;
  const drawCount = Number(pickCount);
  const validPick = Number.isInteger(drawCount) && drawCount >= 1 && drawCount <= candidates.length;
  const poolReady = isNewPool ? candidates.length >= 2 && validPick : !!targetPool && candidates.length > 0;
  const canSubmit = !isSubmitting && !isLoading && !bankError && (isSpecified ? selected.size > 0 : poolReady);

  const changePage = (nextPage: number) => {
    setRequestedPage(nextPage);
    questionList.current?.scrollTo(0, 0);
  };

  const handleSharedChange = (checked: boolean) => {
    setIncludeShared(checked);
    changePage(1);
    if (!checked) {
      setSelected((previous) => new Map([...previous].filter(([, question]) => question.isOwn)));
    }
  };

  const toggleSelected = (question: BankQuestionSummary) => {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(question.id)) next.delete(question.id);
      else next.set(question.id, question);
      return next;
    });
  };

  const togglePoolTopic = (id: string, name: string) => {
    setPoolTopics((previous) => {
      const next = new Map(previous);
      if (next.has(id)) next.delete(id);
      else next.set(id, name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isSpecified) {
        const newExamQuestions: BuilderQuestion[] = [];
        for (const id of selected.keys()) {
          const bankQuestion = await getBankQuestionById(id);
          const topicIds = requireTopicIds(bankQuestion.topicIds);
          newExamQuestions.push({
            ...bankQuestion,
            id: crypto.randomUUID(),
            sourceBankQuestionId: id,
            topicIds,
            number: startingNumber + newExamQuestions.length + 1,
            // Independent copies own their child rows.
            ...(bankQuestion.type === "multiple-choice"
              ? { options: bankQuestion.options.map((option) => ({ ...option, id: crypto.randomUUID() })) }
              : {}),
            ...(bankQuestion.type === "coding"
              ? { testCases: bankQuestion.testCases.map((testCase) => ({ ...testCase, id: crypto.randomUUID() })) }
              : {}),
            ...(bankQuestion.type === "fill-in-the-blank"
              ? { acceptedAnswers: bankQuestion.acceptedAnswers.map((answer) => ({ ...answer, id: crypto.randomUUID() })) }
              : {}),
          });
        }
        onQuestionsAdded(newExamQuestions);
      } else {
        const items: PoolItem[] = candidates.map((question) => ({
          bankQuestionId: question.id,
          title: question.title,
          type: question.type,
          points: question.points,
          topics: question.topics,
        }));
        if (isNewPool) onPoolItemsAdded({ kind: "new", pickCount: drawCount }, items);
        else if (targetPool) onPoolItemsAdded({ kind: "existing", poolId: targetPool.id }, items);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not load these questions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting ? "Adding..." : isSpecified
    ? `Add Selected (${selected.size})` : isNewPool
      ? "Create Pool" : `Add to Pool (${candidates.length})`;

  return (
    <ExamDialog title="Add from Question Bank" wide busy={isSubmitting} onClose={onClose} footer={<>
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <label htmlFor="picker-destination" className="whitespace-nowrap text-xs font-medium text-stone-600">Add as</label>
        <TeacherSelect
          id="picker-destination"
          label="Add as"
          value={destination}
          onChange={(value) => {
            setDestination(value);
            setSubmitError(null);
          }}
          className="w-52 max-w-full"
          disabled={isSubmitting}
          options={[
            { value: SPECIFIED, label: "Always included" },
            { value: NEW_POOL, label: "New random pool" },
            ...pools.map((pool) => ({ value: `pool:${pool.id}`, label: `Pool: ${pool.title.trim() || "Untitled pool"}` })),
          ]}
        />
      </div>
      <button type="button" className={examSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
      <button type="button" className={examPrimary} onClick={handleSubmit} disabled={!canSubmit}>{submitLabel}</button>
    </>}>
      {isSpecified ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-[1_1_11rem]">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
            <input type="search" aria-label="Search bank questions" placeholder="Search bank questions" value={search}
              onChange={(event) => { setSearch(event.target.value); changePage(1); }}
              className={`${examField} pl-9`} />
          </label>
          <QuestionBankFilters includeShared={includeShared} onSharedChange={handleSharedChange} disabled={isSubmitting}
            fields={{
              type: typeFilter,
              topicId: topicFilter?.id ?? "",
              topics: [{ value: "", label: "All topics" }, ...topicOptions.map(([value, label]) => ({ value, label }))],
              onTypeChange: (type) => { setTypeFilter(type); changePage(1); },
              onTopicChange: (id) => {
                const topic = topicOptions.find(([optionId]) => optionId === id);
                setTopicFilter(topic ? { id: topic[0], name: topic[1] } : null);
                changePage(1);
              },
            }} />
          <button type="button" className={examSecondary} disabled={isSubmitting}
            onClick={() => { onCreateNewQuestion("multiple-choice"); onClose(); }}>
            <Plus size={14} aria-hidden="true" />
            Create New
          </button>
        </div>
      ) : (
        <div className="mb-3 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <label htmlFor="pool-question-type" className="mb-1 block text-sm font-medium">Question type</label>
              <TeacherSelect id="pool-question-type" label="Question type" value={poolType}
                onChange={(type) => { setPoolType(type); setPoolTopics(new Map()); }}
                className="w-56 max-w-full" placeholder="Select a question type" options={typeOptions} />
            </div>
            <QuestionBankFilters includeShared={includeShared} onSharedChange={handleSharedChange} disabled={isSubmitting} />
          </div>
          {poolType && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Topics</legend>
              {poolTopicOptions.length > 0 ? (
                <div className="grid max-h-40 gap-x-4 gap-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 sm:grid-cols-2">
                  {poolTopicOptions.map(([id, name]) => (
                    <label key={id} className="flex min-h-8 items-center gap-2 rounded px-1 text-sm hover:bg-stone-100">
                      <input type="checkbox" checked={poolTopics.has(id)} onChange={() => togglePoolTopic(id, name)}
                        className="size-4 shrink-0 accent-[#465a3b]" />
                      <span className="min-w-0 wrap-anywhere">{name}</span>
                    </label>
                  ))}
                </div>
              ) : !isLoading && !bankError && <p className="text-sm text-stone-600">No topics have questions of this type.</p>}
            </fieldset>
          )}
          {isNewPool && (
            <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
              Questions each student gets
              <input type="number" min={1} max={Math.max(1, candidates.length)} step={1} value={pickCount}
                onChange={(event) => setPickCount(event.target.value)} className={`${examField} max-w-20`} />
            </label>
          )}
        </div>
      )}

      {isLoading && <p role="status" className="text-sm text-stone-600">Loading question bank...</p>}
      {bankError && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-red-700">{bankError}</p>
          <button type="button" className={examSecondary} onClick={() => { void refetch(); }}>Retry</button>
        </div>
      )}

      {!isLoading && !bankError && (isSpecified ? (
        <>
          <div ref={questionList} className="max-h-[42dvh] divide-y divide-stone-200 overflow-y-auto overscroll-contain border-y border-stone-200">
            {filteredQuestions.slice(pageStart, pageStart + PAGE_SIZE).map((question) => {
              const isSelected = selected.has(question.id);
              const inPool = pooledIds.has(question.id);
              return (
                <button type="button" key={question.id} aria-pressed={isSelected}
                  disabled={isSubmitting || inPool || question.topics.length === 0} onClick={() => toggleSelected(question)}
                  className="flex w-full items-start gap-3 px-2 py-2.5 text-left hover:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] aria-pressed:bg-[#edf1e8] disabled:opacity-60">
                  <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${isSelected ? "border-[#465a3b] bg-[#465a3b] text-white" : "border-stone-300"}`}>
                    {isSelected && <Check size={13} />}
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    <span className="block text-sm font-medium">
                      {question.title}
                      {!question.isOwn && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase">Shared</span>}
                    </span>
                    <span className="block text-xs text-stone-600">{questionTypeLabels[question.type]} • {question.points} pts</span>
                    {inPool && <span className="mt-1 block text-xs text-stone-600">Already in a random pool</span>}
                    {question.topics.length > 0
                      ? <span className="mt-1 block text-xs text-stone-600">{question.topics.map((topic) => topic.name).join(", ")}</span>
                      : <span className="mt-1 block text-xs text-red-700">
                        {question.isOwn ? "Assign topics in Question Bank before reusing this question." : "The owner must assign topics before this question can be reused."}
                      </span>}
                  </span>
                </button>
              );
            })}
            {filteredQuestions.length === 0 && (
              <p role="status" className="py-6 text-center text-sm text-stone-600">No bank questions match your filters.</p>
            )}
          </div>
          {pageCount > 1 && (
            <nav aria-label="Question bank pages" className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-sm text-stone-600 tabular-nums">Page {page} of {pageCount}</p>
              <div className="flex gap-2">
                <button type="button" className={examSecondary} disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button>
                <button type="button" className={examSecondary} disabled={page === pageCount} onClick={() => changePage(page + 1)}>Next</button>
              </div>
            </nav>
          )}
        </>
      ) : (
        <div role="status" className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
          {!poolType || poolTopics.size === 0 ? "Choose a question type and at least one topic." : (
            <>
              <p>{candidates.length} {candidates.length === 1 ? "question matches" : "questions match"} the selected type and any selected topic.</p>
              {isNewPool && candidates.length < 2 && <p>A new random pool needs at least two matching questions.</p>}
              {isNewPool && candidates.length >= 2 && !validPick && <p>Enter a whole number from 1 to {candidates.length}.</p>}
              {excludedCount > 0 && <p>Excluded {excludedCount} already in this exam’s Always included list{targetPool ? " or this pool" : ""}.</p>}
            </>
          )}
        </div>
      ))}
      {submitError && <p role="alert" className="mt-3 text-sm text-red-700">{submitError}</p>}
    </ExamDialog>
  );
}
