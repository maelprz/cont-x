import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Plus, Search } from "lucide-react";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ExamBuilderEditorPanel } from "../../components/examBuilder/examBuilderEditorPanel";
import { UnsavedChangesPrompt } from "../../components/examBuilder/unsavedChangesPrompt";
import { ExamConfirmDialog, examField, examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { BankSharing } from "../../components/questionBank/bankVisibilitySelector";
import { NewQuestionModal } from "../../components/questionBank/newQuestionModal";
import { TeacherSelect } from "../../components/shared/teacherSelect";
import { TeacherSwitch } from "../../components/shared/teacherSwitch";
import { useToast } from "../../hooks/useToast";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { useBankSubjects } from "../../hooks/useBankSubjects";
import { useBankVisibility } from "../../hooks/useBankVisibility";
import { useQuestionBankStore } from "../../store/useQuestionBankStore";
import { useSaveBankQuestion } from "../../hooks/useSaveBankQuestion";
import { useRouterLogic } from "../../router/routerLogic";
import { deleteBankQuestion, getBankQuestionById } from "../../services/questionBankService";
import { createBlankMCQuestion, createBlankCodingQuestion, createBlankFitbQuestion, questionTypeLabels } from "../../components/examBuilder/createBlankQuestion";
import type { BuilderQuestion, QuestionType } from "../examBuilder/examBuilderScreen.types";

export function QuestionBankScreen() {
  const selectedSubjectId = useQuestionBankStore((state) => state.selectedSubjectId);
  const setSelectedSubjectId = useQuestionBankStore((state) => state.setSelectedSubjectId);
  const setResetHandler = useQuestionBankStore((state) => state.setResetHandler);
  const { subjects, isLoading: subjectsLoading, error: subjectsError, refetch: refetchSubjects } = useBankSubjects();
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];
  const visibility = useBankVisibility();
  const [includeShared, setIncludeShared] = useState(false);
  const { questions, isLoading, error, refetch } = useQuestionBank(selectedSubject?.id ?? null, includeShared);
  const { saveQuestion, error: saveError, clearError: clearSaveError } = useSaveBankQuestion();
  const { showToast } = useToast();
  const setNavigationGuard = useRouterLogic((state) => state.setNavigationGuard);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);

  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState("");
  const [selectedTopicLabel, setSelectedTopicLabel] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showSharing, setShowSharing] = useState(false);
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BuilderQuestion | null>(null);
  const [savedQuestion, setSavedQuestion] = useState<BuilderQuestion | null>(null);
  const [openingQuestionId, setOpeningQuestionId] = useState<string | null>(null);
  const openRequest = useRef(0);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [operation, setOperation] = useState<"save" | "delete" | null>(null);
  const busy = useRef(false);
  const editorHeading = useRef<HTMLDivElement>(null);
  const bankHeading = useRef<HTMLHeadingElement>(null);
  const reviewPane = useRef<HTMLElement>(null);
  const hasUnsavedChanges = editingQuestion !== null && JSON.stringify(editingQuestion) !== JSON.stringify(savedQuestion);

  useEffect(() => {
    if (!hasUnsavedChanges && !operation) return;
    setNavigationGuard((screen) => {
      if (!busy.current) setPendingLeave(() => () => forceNavigateTo(screen));
    });
    return () => setNavigationGuard(null);
  }, [forceNavigateTo, hasUnsavedChanges, operation, setNavigationGuard]);

  useEffect(() => {
    if (!hasUnsavedChanges && !operation) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges, operation]);

  useEffect(() => {
    setResetHandler(() => {
      if (busy.current) return;
      const reset = () => {
        openRequest.current += 1;
        setOpeningQuestionId(null);
        setEditingQuestion(null);
        setSelectedSubjectId(null);
        setSelectedQuestionId(null);
        setSearch("");
        setTopicId("");
        setTypeFilter("all");
        setIncludeShared(false);
      };
      if (hasUnsavedChanges) setPendingLeave(() => reset);
      else reset();
    });
    return () => setResetHandler(null);
  }, [hasUnsavedChanges, setResetHandler, setSelectedSubjectId]);

  useEffect(() => () => { openRequest.current += 1; }, []);

  const visibleQuestions = questions.filter((question) => question.isOwn ? question.subjectId === selectedSubject?.id : includeShared);
  const topicOptions = [...new Map(visibleQuestions.flatMap((question) => question.topics).map((topic) => [topic.id, topic])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const query = search.trim().toLowerCase();
  const filteredQuestions = visibleQuestions.filter((question) =>
    question.title.toLowerCase().includes(query) &&
    (typeFilter === "all" || question.type === typeFilter) &&
    (!topicId || question.topics.some((topic) => topic.id === topicId)),
  );
  const selectedQuestion = filteredQuestions.find((question) => question.id === selectedQuestionId) ?? filteredQuestions[0];
  const topicChoices = [{ value: "", label: "All topics" }, ...topicOptions.map((topic) => ({ value: topic.id, label: topic.name }))];
  if (topicId && !topicChoices.some((topic) => topic.value === topicId)) topicChoices.push({ value: topicId, label: selectedTopicLabel });

  function chooseSubject(id: string) {
    openRequest.current += 1;
    setOpeningQuestionId(null);
    setSelectedSubjectId(id);
    setSelectedQuestionId(null);
    setIncludeShared(false);
    setSearch("");
    setTopicId("");
    setTypeFilter("all");
  }

  function openEditor(question: BuilderQuestion, saved: BuilderQuestion | null) {
    clearSaveError();
    setEditingQuestion(question);
    setSavedQuestion(saved);
    requestAnimationFrame(() => editorHeading.current?.focus());
  }

  async function editQuestion(id: string) {
    if (!questions.some((question) => question.id === id && question.isOwn)) return;
    const request = ++openRequest.current;
    setOpeningQuestionId(id);
    try {
      const question = await getBankQuestionById(id);
      if (openRequest.current === request) openEditor(question, question);
    } catch (err) {
      if (openRequest.current === request) showToast(err instanceof Error ? err.message : "Could not load this question.", "error");
    } finally {
      if (openRequest.current === request) setOpeningQuestionId(null);
    }
  }

  function createQuestion(type: QuestionType) {
    openRequest.current += 1;
    setOpeningQuestionId(null);
    setShowNewQuestion(false);
    const id = crypto.randomUUID();
    const question = type === "multiple-choice" ? createBlankMCQuestion(id, 0)
      : type === "fill-in-the-blank" ? createBlankFitbQuestion(id, 0)
      : createBlankCodingQuestion(id, 0);
    openEditor(question, null);
  }

  function returnToBank() {
    setEditingQuestion(null);
    requestAnimationFrame(() => bankHeading.current?.focus());
  }

  async function persistQuestion(leave?: () => void) {
    if (busy.current || !editingQuestion || !selectedSubject) return;
    busy.current = true;
    setOperation("save");
    try {
      if (!(await saveQuestion(editingQuestion, selectedSubject.id))) return;
      setSelectedQuestionId(editingQuestion.id);
      showToast("Question saved to bank.", "success");
      await Promise.all([refetch(), refetchSubjects()]);
      setPendingLeave(null);
      if (leave) leave();
      else returnToBank();
    } finally {
      busy.current = false;
      setOperation(null);
    }
  }

  async function confirmDelete() {
    if (busy.current || !savedQuestion) return;
    busy.current = true;
    setOperation("delete");
    setDeleteError(null);
    try {
      await deleteBankQuestion(savedQuestion.id);
      showToast("Question deleted.", "success");
      await Promise.all([refetch(), refetchSubjects()]);
      setShowDelete(false);
      returnToBank();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this question.");
    } finally {
      busy.current = false;
      setOperation(null);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="questionBank" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title={editingQuestion ? (savedQuestion ? "Edit question" : "New question") : "Question Bank"} />
        {editingQuestion ? (
          <>
            <div ref={editorHeading} tabIndex={-1} className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-base-300)] bg-[var(--color-base-100)] px-4 py-3 sm:px-7">
              <button type="button" className={examSecondary} disabled={operation !== null} onClick={() => hasUnsavedChanges ? setPendingLeave(() => returnToBank) : returnToBank()}>
                <ArrowLeft size={15} aria-hidden="true" /> Question Bank
              </button>
              <button type="button" className={`${examPrimary} ml-auto`} disabled={operation !== null} onClick={() => void persistQuestion()}>
                {operation === "save" && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
                {operation === "save" ? "Saving…" : "Save question"}
              </button>
            </div>
            <ExamBuilderEditorPanel
              subjectId={selectedSubject?.id ?? null}
              subjectName={selectedSubject?.name}
              activeQuestion={editingQuestion}
              editorTab={editingQuestion.type}
              showQuestionNumber={false}
              busy={operation !== null}
              isLoading={false}
              error={null}
              saveAllError={pendingLeave ? null : saveError}
              deleteError={null}
              isDeleting={operation === "delete"}
              onQuestionChange={(question) => { clearSaveError(); setEditingQuestion(question); }}
              onDeleteQuestion={savedQuestion ? () => { setDeleteError(null); setShowDelete(true); } : undefined}
              onDiscard={hasUnsavedChanges ? () => {
                clearSaveError();
                if (savedQuestion) setEditingQuestion(savedQuestion);
                else setPendingLeave(() => returnToBank);
              } : undefined}
            />
          </>
        ) : (
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
            <div className="shrink-0 space-y-3 border-b border-[var(--color-base-300)] px-4 py-3 sm:px-6">
              <h2 ref={bankHeading} tabIndex={-1} className="sr-only">Question Bank results</h2>
              <div className="flex flex-wrap items-center gap-2">
                {selectedSubject && (
                  <TeacherSelect label="Subject bank" className="w-full sm:w-60" value={selectedSubject.id} onChange={chooseSubject}
                    options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  <BankSharing subject={selectedSubject ?? null} settings={visibility.settings} isLoading={visibility.isLoading} isSaving={visibility.isSaving} error={visibility.error} isOpen={showSharing} onOpen={() => setShowSharing(true)} onClose={() => setShowSharing(false)} onMainChange={visibility.updateMainLevel} onSubjectChange={visibility.updateSubjectLevel} />
                  {selectedSubject && (
                    <button type="button" className={examPrimary} onClick={() => { openRequest.current += 1; setOpeningQuestionId(null); setShowNewQuestion(true); }}>
                      <Plus size={16} aria-hidden="true" /> New question
                    </button>
                  )}
                </div>
              </div>
              {selectedSubject && <>
                <div className="flex flex-wrap gap-2">
                  <label className="relative min-w-0 flex-[2_1_11rem] sm:max-w-xs">
                    <span className="sr-only">Search questions by title</span>
                    <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
                    <input type="search" className={`${examField} pl-9`} placeholder="Search by title" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </label>
                  <TeacherSelect label="Filter by topic" className="flex-[1_1_8rem] sm:max-w-52" value={topicId} options={topicChoices}
                    onChange={(value) => { setTopicId(value); setSelectedTopicLabel(topicChoices.find((topic) => topic.value === value)?.label ?? ""); }} />
                  <TeacherSelect label="Filter by type" className="flex-[1_1_8rem] sm:max-w-52" value={typeFilter} onChange={setTypeFilter}
                    options={[{ value: "all", label: "All types" }, ...Object.entries(questionTypeLabels).map(([value, label]) => ({ value, label }))]} />
                </div>
                <TeacherSwitch label="Show shared questions" checked={includeShared} onChange={setIncludeShared} />
              </>}
            </div>
            {subjectsLoading && <p role="status" className="px-4 py-3 text-sm text-stone-600">Loading subjects…</p>}
            {subjectsError && <div className="space-y-2 px-4 py-3"><p role="alert" className="text-sm text-red-700">{subjectsError}</p><button type="button" className={examSecondary} onClick={() => void refetchSubjects()}>Retry</button></div>}
            {!selectedSubject && !subjectsLoading && !subjectsError && <p className="px-4 py-3 text-sm text-stone-600">Ask an admin to assign you a subject to open its question bank.</p>}
            {selectedSubject && (
              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(260px,2fr)_minmax(0,3fr)]">
                <section aria-label="Question results" className="min-w-0 border-b border-[var(--color-base-300)] px-3 py-3 lg:overflow-y-auto lg:border-r lg:border-b-0">
                  {isLoading ? <p role="status" className="px-2 text-sm text-stone-600">Loading questions…</p>
                    : error ? <div className="space-y-2 px-2"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" className={examSecondary} onClick={() => void refetch()}>Retry</button></div>
                    : !filteredQuestions.length ? <p role="status" className="px-2 text-sm text-stone-600">{query || topicId || typeFilter !== "all" ? "No questions match your search or filters." : "No questions to show in this subject bank."}</p>
                    : <>
                      <p role="status" className="mb-1 px-2 text-xs text-stone-600">{filteredQuestions.length} {filteredQuestions.length === 1 ? "question" : "questions"}</p>
                      <ul className="divide-y divide-[var(--color-base-300)]">
                        {filteredQuestions.map((question) => (
                          <li key={question.id} className="py-1">
                            <button type="button" aria-pressed={question.id === selectedQuestion?.id}
                              className="flex w-full min-w-0 flex-wrap items-start justify-between gap-2 rounded-md px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#465a3b] hover:bg-stone-100 aria-pressed:bg-[#e9eee3]"
                              onClick={() => {
                                if (question.id !== selectedQuestion?.id) { openRequest.current += 1; setOpeningQuestionId(null); }
                                setSelectedQuestionId(question.id);
                                if (window.matchMedia("(width < 64rem)").matches) requestAnimationFrame(() => reviewPane.current?.focus());
                              }}>
                              <span className="min-w-0">
                                <span className="block wrap-anywhere text-sm font-semibold">{question.title}</span>
                                <span className="block text-xs text-stone-600">{questionTypeLabels[question.type]} · {question.points} pts</span>
                              </span>
                              {!question.isOwn && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-700">Shared</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>}
                </section>
                {selectedQuestion && (
                  <section ref={reviewPane} tabIndex={-1} aria-label="Question details" className="min-w-0 bg-[var(--color-base-100)] p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] sm:p-6 lg:overflow-y-auto">
                    <div className="max-w-3xl space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-stone-600">{questionTypeLabels[selectedQuestion.type]} · {selectedQuestion.points} pts</p>
                          <h2 className="mt-1 wrap-anywhere text-xl font-semibold">{selectedQuestion.title}</h2>
                        </div>
                        {selectedQuestion.isOwn ? (
                          <button type="button" className={examPrimary} disabled={openingQuestionId !== null}
                            aria-label={`Edit ${selectedQuestion.title}`} onClick={() => void editQuestion(selectedQuestion.id)}>
                            {openingQuestionId === selectedQuestion.id ? "Opening…" : "Edit question"}
                          </button>
                        ) : <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs text-stone-700">Shared</span>}
                      </div>
                      {selectedQuestion.prompt && <p className="wrap-anywhere text-sm leading-relaxed whitespace-pre-wrap">{selectedQuestion.prompt}</p>}
                      <div className="space-y-2 border-t border-[var(--color-base-300)] pt-3">
                        <h3 className="text-sm font-semibold">Topics</h3>
                        <div className="flex flex-wrap gap-1">
                          {selectedQuestion.topics.length ? selectedQuestion.topics.map((topic) => <span key={topic.id} className="max-w-full wrap-anywhere rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{topic.name}</span>) : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Needs topic</span>}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600">Created {selectedQuestion.createdAt}</p>
                    </div>
                  </section>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      <NewQuestionModal isOpen={showNewQuestion} onClose={() => setShowNewQuestion(false)} onSelectType={createQuestion} />
      <ExamConfirmDialog isOpen={showDelete} title="Delete this question?" message="This permanently removes the question from your bank. Exams that already have a copy keep it." confirmLabel="Delete question" isProcessing={operation === "delete"} error={deleteError} onConfirm={() => void confirmDelete()} onCancel={() => setShowDelete(false)} />
      <UnsavedChangesPrompt isOpen={pendingLeave !== null} isSaving={operation === "save"} error={saveError} recordLabel="question" leaveLabel="Leave without saving" onSave={() => { if (pendingLeave) void persistQuestion(pendingLeave); }} onLeaveWithoutSaving={() => { pendingLeave?.(); setPendingLeave(null); }} onCancel={() => setPendingLeave(null)} />
    </div>
  );
}
