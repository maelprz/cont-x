import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Tag as TagIcon, ArrowLeft, Trash2, X } from "lucide-react";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";
import { UnsavedChangesPrompt } from "../../components/examBuilder/unsavedChangesPrompt";
import { useToast } from "../../hooks/useToast";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { useBankSubjects } from "../../hooks/useBankSubjects";
import { useBankVisibility } from "../../hooks/useBankVisibility";
import { useQuestionBankStore } from "../../store/useQuestionBankStore";
import { SubjectTile } from "../../components/shared/subjectTile";
import { ConfirmActionDialog } from "../../components/shared/confirmActionDialog";
import { BankVisibilitySelector } from "../../components/questionBank/bankVisibilitySelector";
import { useSaveBankQuestion } from "../../hooks/useSaveBankQuestion";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouterLogic } from "../../router/routerLogic";
import {
  getBankQuestionById,
  deleteBankQuestion,
  createBankTag,
  deleteBankTag,
  addTagToQuestion,
  removeTagFromQuestion,
} from "../../services/questionBankService";
import {
  createBlankMCQuestion,
  createBlankCodingQuestion,
} from "../../components/examBuilder/createBlankQuestion";
import type {
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  QuestionType,
} from "../examBuilder/examBuilderScreen.types";

import { NewQuestionModal } from "../../components/questionBank/newQuestionModal";

export function QuestionBankScreen() {
  const teacherId = useAuthStore((state) => state.user?.id);
  // Two levels now: the sub-question banks (one per subject), then the chosen
  // subject's questions. The open subject lives in a store so it survives
  // leaving the screen and coming back.
  const selectedSubjectId = useQuestionBankStore((state) => state.selectedSubjectId);
  const setSelectedSubjectId = useQuestionBankStore((state) => state.setSelectedSubjectId);
  const setResetHandler = useQuestionBankStore((state) => state.setResetHandler);
  const [includeShared, setIncludeShared] = useState(false); // also list questions shared from other subjects
  const {
    subjects,
    isLoading: isLoadingSubjects,
    error: subjectsError,
    refetch: refetchSubjects,
  } = useBankSubjects();
  const {
    settings: visibility,
    isSaving: isSavingVisibility,
    error: visibilityError,
    updateSubjectLevel,
    updateMainLevel,
  } = useBankVisibility();
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;
  const { questions, tags, isLoading, error, refetch } = useQuestionBank(
    selectedSubject?.id ?? null,
    includeShared,
  );
  const { saveQuestion, isSaving, error: saveError } = useSaveBankQuestion();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "multiple-choice" | "coding">("all");
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [newTagNameInEditor, setNewTagNameInEditor] = useState("");

  const [editingQuestion, setEditingQuestion] = useState<BuilderQuestion | null>(null);
  // deleting a question or a tag is permanent, so it always asks first
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "question" | "tag"; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTagIds, setEditingTagIds] = useState<string[]>([]);

  // last confirmed-saved version of the question being edited, null while creating brand new —
  // used the same way examBuilderScreen uses savedQuestions, just for a single question at a time
  const [savedQuestionSnapshot, setSavedQuestionSnapshot] = useState<BuilderQuestion | null>(null);

  // holds a callback for wherever the user tried to go, while we ask them to confirm —
  // works for both router navigation (sidebar) and the in-screen "Back" button
  const [pendingLeaveAction, setPendingLeaveAction] = useState<(() => void) | null>(null);
  const setNavigationGuard = useRouterLogic((state) => state.setNavigationGuard);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);

  const isNewQuestion = editingQuestion != null && !questions.some((q) => q.id === editingQuestion.id);

  // true while editing and either the question content or its tag selection differs from what's saved
  const hasUnsavedChanges =
    editingQuestion !== null &&
    (JSON.stringify(editingQuestion) !== JSON.stringify(savedQuestionSnapshot) ||
      JSON.stringify([...editingTagIds].sort()) !== JSON.stringify([...originalTagIds].sort()));

  // guards router-level navigation (e.g. clicking the sidebar) while there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setNavigationGuard(null);
      return;
    }
    setNavigationGuard((nextScreen) => setPendingLeaveAction(() => () => forceNavigateTo(nextScreen)));
    return () => setNavigationGuard(null);
  }, [hasUnsavedChanges, setNavigationGuard]);

  // warns on browser refresh/close too, same as Exam Builder
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
      const matchesTags =
        activeTagIds.length === 0 || activeTagIds.every((tagId) => q.tags.some((t) => t.id === tagId));
      const matchesType = activeTypeFilter === "all" || q.type === activeTypeFilter;
      return matchesSearch && matchesTags && matchesType;
    });
  }, [questions, search, activeTagIds, activeTypeFilter]);

  const openSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIncludeShared(false);
    setSearch("");
    setActiveTagIds([]);
    setActiveTypeFilter("all");
  };

  const backToSubjects = () => {
    setSelectedSubjectId(null);
    setIncludeShared(false);
    refetchSubjects(); // counts on the tiles may have changed
  };

  const toggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleCreateTagInEditor = async () => {
    const trimmed = newTagNameInEditor.trim();
    if (!trimmed || !teacherId) return;
    try {
      await createBankTag(teacherId, trimmed);
      setNewTagNameInEditor("");
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create tag.", "error");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteBankTag(tagId);
      setEditingTagIds((prev) => prev.filter((id) => id !== tagId));
      setOriginalTagIds((prev) => prev.filter((id) => id !== tagId));
      setActiveTagIds((prev) => prev.filter((id) => id !== tagId));
      showToast("Tag deleted.", "success");
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete tag.", "error");
    }
  };

  // opens the editor for an existing bank question, and snapshots it as the saved baseline
  const handleSelectQuestion = async (id: string) => {
    const target = questions.find((q) => q.id === id);
    if (target && !target.isOwn) {
      // row-level security only lets the owner change a bank question, so don't open an editor that can't save
      showToast("This question was shared with you, so only its owner can edit it. Add it to an exam to reuse it.", "error");
      return;
    }
    try {
      const question = await getBankQuestionById(id);
      setEditingQuestion(question);
      setSavedQuestionSnapshot(question); // this is what "saved" means until the next edit
      const row = questions.find((q) => q.id === id);
      const tagIds = row?.tags.map((t) => t.id) ?? [];
      setEditingTagIds(tagIds);
      setOriginalTagIds(tagIds);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load this question.", "error");
    }
  };

  // starts a brand new blank question — no saved snapshot yet, so it's immediately "unsaved"
  const handleCreateNew = (type: QuestionType) => {
    const blank =
      type === "multiple-choice"
        ? createBlankMCQuestion(crypto.randomUUID(), 0)
        : createBlankCodingQuestion(crypto.randomUUID(), 0);
    setEditingQuestion(blank);
    setSavedQuestionSnapshot(null); // nothing saved yet — matches the "not yet persisted" state
    setEditingTagIds([]);
    setOriginalTagIds([]);
  };

  // leaves the editor — but if there are unsaved changes, asks first instead of leaving immediately
  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      setPendingLeaveAction(() => () => setEditingQuestion(null));
    } else {
      setEditingQuestion(null);
    }
  };

  // saves the currently open question — now returns whether it actually succeeded,
  // so the leave-prompt knows whether it's safe to continue navigating afterward
  const handleSave = async (): Promise<boolean> => {
    if (!editingQuestion) return false;
    if (!selectedSubject) return false; // new questions are always created inside an open subject
    const didSave = await saveQuestion(editingQuestion, selectedSubject.id);
    if (!didSave) {
      showToast(saveError ?? "Could not save this question.", "error");
      return false;
    }

    const tagsToAdd = editingTagIds.filter((id) => !originalTagIds.includes(id));
    const tagsToRemove = originalTagIds.filter((id) => !editingTagIds.includes(id));

    try {
      await Promise.all([
        ...tagsToAdd.map((tagId) => addTagToQuestion(editingQuestion.id, tagId)),
        ...tagsToRemove.map((tagId) => removeTagFromQuestion(editingQuestion.id, tagId)),
      ]);
      showToast("Question saved to bank.", "success");
      await refetch();
      setEditingQuestion(null);
      return true;
    } catch (err) {
      showToast(
        err instanceof Error ? `Question saved, but tags failed: ${err.message}` : "Question saved, but tags failed to update.",
        "error",
      );
      return false; // tag sync failed — don't treat this as a clean save for leave-prompt purposes
    }
  };

  // teacher chose "Save" from the leave prompt — save first, then continue leaving only if it worked
  const handleSaveAndLeave = async () => {
    const didSave = await handleSave();
    if (!didSave) return; // stay put, error toast already shown by handleSave
    pendingLeaveAction?.();
    setNavigationGuard(null);
    setPendingLeaveAction(null);
  };

  // teacher chose to discard changes and leave anyway
  const handleLeaveWithoutSaving = () => {
    setNavigationGuard(null);
    pendingLeaveAction?.();
    setPendingLeaveAction(null);
  };

  // teacher chose to stay
  const handleCancelLeave = () => setPendingLeaveAction(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteBankQuestion(id);
      showToast("Question deleted.", "success");
      await refetch();
      setEditingQuestion(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete this question.", "error");
    }
  };

  // runs after the teacher confirms the delete dialog
  const runConfirmedDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    if (confirmDelete.kind === "question") await handleDelete(confirmDelete.id);
    else await handleDeleteTag(confirmDelete.id);
    setIsDeleting(false);
    setConfirmDelete(null);
  };

  // The sidebar's "Question Bank" was clicked while already on this screen: go back to the
  // subject list, asking first if a question is half-edited. The sidebar calls this handler.
  useEffect(() => {
    setResetHandler(() => {
      const goToSubjectList = () => {
        setEditingQuestion(null);
        setSelectedSubjectId(null);
        setIncludeShared(false);
        refetchSubjects(); // counts on the tiles may have changed
      };
      if (hasUnsavedChanges) setPendingLeaveAction(() => goToSubjectList);
      else goToSubjectList();
    });
    return () => setResetHandler(null);
  }, [hasUnsavedChanges, setResetHandler, setSelectedSubjectId, refetchSubjects]);

  const handleToggleQuestionTag = (tagId: string) => {
    setEditingTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-base-200)" }}>
      <TeacherSidebar activeItem="questionBank" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader />

        <main className="flex-1 overflow-y-auto px-8 py-6" style={{ color: "var(--color-base-content)" }}>
          {editingQuestion ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-base-content)", opacity: 0.7 }}
                >
                  <ArrowLeft size={15} />
                  Back to {selectedSubject?.name ?? "Question Bank"}
                </button>
                <div className="flex items-center gap-3">
                  {!isNewQuestion && (
                    <button
                      onClick={() => setConfirmDelete({ kind: "question", id: editingQuestion.id })}
                      className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-error)" }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-content)",
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Question"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-5">
                <TagIcon size={14} style={{ opacity: 0.5 }} />
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-[12px] font-medium border"
                    style={{
                      borderColor: editingTagIds.includes(tag.id) ? "var(--color-secondary)" : "var(--color-base-300)",
                      backgroundColor: editingTagIds.includes(tag.id) ? "var(--color-secondary)" : "transparent",
                      color: editingTagIds.includes(tag.id) ? "white" : "var(--color-base-content)",
                    }}
                  >
                    <button
                      onClick={() => handleToggleQuestionTag(tag.id)}
                      className="cursor-pointer border-none bg-transparent p-0 text-inherit"
                    >
                      {tag.name}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ kind: "tag", id: tag.id })}
                      title="Delete this tag everywhere"
                      className="cursor-pointer border-none bg-transparent p-0.5 opacity-60 hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="+ New tag"
                  value={newTagNameInEditor}
                  onChange={(e) => setNewTagNameInEditor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTagInEditor()}
                  className="px-3 py-1 rounded-full text-[12px] outline-none border border-dashed"
                  style={{ borderColor: "var(--color-base-300)", backgroundColor: "transparent", color: "var(--color-base-content)", width: 100 }}
                />
              </div>

              {editingQuestion.type === "multiple-choice" ? (
                <MCQEditorPanel
                  question={editingQuestion as MCQBuilderQuestion}
                  onChange={(q) => setEditingQuestion(q)}
                />
              ) : (
                <CodingEditorPanel
                  question={editingQuestion as CodingBuilderQuestion}
                  onChange={(q) => setEditingQuestion(q)}
                />
              )}
            </>
          ) : !selectedSubject ? (
            // ── Level 1: sub-question banks, one per subject ─────────────────
            <>
              <p className="text-[13px] mb-3 opacity-60">Teacher Portal &gt; Question Bank</p>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Question Bank</h1>
                <p className="text-sm opacity-70 mt-1">Choose a subject to see its questions.</p>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap p-4 mb-6 rounded-2xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]">
                <div className="max-w-lg">
                  <p className="text-[14px] font-semibold">Main question bank sharing</p>
                  <p className="text-[12px] opacity-60 mt-0.5 leading-relaxed">
                    Applies one sharing level to every subject at once, overriding each subject's own
                    setting. "No override" goes back to per-subject settings.
                  </p>
                </div>
                <BankVisibilitySelector
                  allowNone
                  value={visibility.mainLevel}
                  disabled={isSavingVisibility}
                  onChange={(level) => updateMainLevel(level)}
                />
              </div>
              {visibilityError && (
                <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>{visibilityError}</p>
              )}

              {isLoadingSubjects ? (
                <p className="text-[13px] opacity-60">Loading sub-banks...</p>
              ) : subjectsError ? (
                <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{subjectsError}</p>
              ) : subjects.length === 0 ? (
                <p className="text-[13px] opacity-60">
                  You aren't assigned to any subjects yet. Ask an admin to assign you one, and its
                  question bank will show up here.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-5">
                  {subjects.map((subject) => (
                    <SubjectTile
                      key={subject.id}
                      name={subject.name}
                      stats={[
                        { label: "Questions", value: subject.totalCount },
                        { label: "Shared with you", value: subject.totalCount - subject.ownCount },
                      ]}
                      onClick={() => openSubject(subject.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            // ── Level 2: the questions under the chosen subject ──────────────
            <>
              <p className="text-[13px] mb-3 opacity-60">
                Teacher Portal &gt;{" "}
                <button
                  onClick={backToSubjects}
                  className="p-0 border-none bg-transparent cursor-pointer text-inherit text-[13px] hover:underline"
                >
                  Question Bank
                </button>{" "}
                &gt; {selectedSubject.name}
              </p>
              <div className="flex items-end justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
                  <p className="text-sm opacity-70 mt-1">Questions in this subject.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowNewQuestionModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                  >
                    <Plus size={14} />
                    New Question
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap p-4 mb-5 rounded-2xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]">
                <div className="max-w-lg">
                  <p className="text-[14px] font-semibold">Sharing for this subject</p>
                  <p className="text-[12px] opacity-60 mt-0.5 leading-relaxed">
                    {visibility.mainLevel
                      ? "Your main question bank setting is overriding this. Change it from the sub-bank list."
                      : "Who else can see the questions you create here."}
                  </p>
                </div>
                <BankVisibilitySelector
                  value={visibility.mainLevel ?? visibility.subjectLevels[selectedSubject.id] ?? "course"}
                  disabled={visibility.mainLevel !== null || isSavingVisibility}
                  onChange={(level) => level && updateSubjectLevel(selectedSubject.id, level)}
                />
              </div>
              {visibilityError && (
                <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>{visibilityError}</p>
              )}

              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border w-full max-w-md mb-3 border-[var(--color-base-300)] bg-[var(--color-base-100)]">
                <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search questions by title"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-grow text-[13px] outline-none bg-transparent border-none text-[var(--color-base-content)] font-[inherit]"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
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

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <TagIcon size={14} style={{ opacity: 0.5 }} />
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

              <label className="flex items-center gap-2 mb-6 cursor-pointer text-[12px] opacity-80">
                <input
                  type="checkbox"
                  checked={includeShared}
                  onChange={(e) => setIncludeShared(e.target.checked)}
                />
                Also show questions shared with me from other subjects
              </label>

              {isLoading && <p className="text-[13px] opacity-60">Loading question bank...</p>}
              {error && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{error}</p>}

              {!isLoading && !error && (
                <div className="rounded-2xl border overflow-hidden bg-[var(--color-base-100)] border-[var(--color-base-300)]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-black/[0.02]">
                        <th className="text-left text-[11px] uppercase tracking-wide opacity-60 py-3 px-5 border-b border-[var(--color-base-300)]">Title</th>
                        <th className="text-left text-[11px] uppercase tracking-wide opacity-60 py-3 px-5 border-b border-[var(--color-base-300)]">Type</th>
                        <th className="text-left text-[11px] uppercase tracking-wide opacity-60 py-3 px-5 border-b border-[var(--color-base-300)]">Points</th>
                        <th className="text-left text-[11px] uppercase tracking-wide opacity-60 py-3 px-5 border-b border-[var(--color-base-300)]">Tags</th>
                        <th className="text-left text-[11px] uppercase tracking-wide opacity-60 py-3 px-5 border-b border-[var(--color-base-300)]">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => handleSelectQuestion(q.id)}
                          className={q.isOwn ? "cursor-pointer hover:bg-black/[0.02]" : "cursor-default"}
                        >
                          <td className="py-3.5 px-5 text-[14px] border-b border-[var(--color-base-300)]">
                            {q.title}
                            {!q.isOwn && (
                              <span
                                className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide align-middle"
                                style={{ backgroundColor: "var(--color-base-300)" }}
                              >
                                Shared
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-[13px] border-b border-[var(--color-base-300)] opacity-70">
                            {q.type === "multiple-choice" ? "Multiple Choice" : "Coding"}
                          </td>
                          <td className="py-3.5 px-5 text-[13px] border-b border-[var(--color-base-300)] opacity-70">{q.points}</td>
                          <td className="py-3.5 px-5 text-[13px] border-b border-[var(--color-base-300)]">
                            <div className="flex flex-wrap gap-1">
                              {q.tags.map((t) => (
                                <span key={t.id} className="px-2 py-0.5 rounded-full text-[11px]" style={{ backgroundColor: "var(--color-base-200)" }}>
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-[13px] border-b border-[var(--color-base-300)] opacity-70">{q.createdAt}</td>
                        </tr>
                      ))}
                      {filteredQuestions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[13px] opacity-50">
                            {questions.length === 0
                              ? "No questions in this sub-bank yet. Create the first one with New Question."
                              : "No questions match your search or filters."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <NewQuestionModal
        isOpen={showNewQuestionModal}
        onClose={() => setShowNewQuestionModal(false)}
        onSelectType={(type) => {
          setShowNewQuestionModal(false);
          handleCreateNew(type);
        }}
      />

      <ConfirmActionDialog
        isOpen={confirmDelete !== null}
        title={confirmDelete?.kind === "tag" ? "Delete this tag?" : "Delete this question?"}
        message={
          confirmDelete?.kind === "tag"
            ? "It will be removed from every question that uses it. This can't be undone."
            : "This permanently removes the question from your bank. Exams that already have a copy keep it."
        }
        confirmLabel={confirmDelete?.kind === "tag" ? "Delete Tag" : "Delete Question"}
        isProcessing={isDeleting}
        error={null}
        onConfirm={runConfirmedDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <UnsavedChangesPrompt
        isOpen={pendingLeaveAction !== null}
        onSave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onCancel={handleCancelLeave}
      />
    </div>
  );
}