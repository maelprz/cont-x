import { useState, useMemo } from "react";
import { Search, Plus, Tag as TagIcon, ArrowLeft, Trash2, X } from "lucide-react";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";
import { Toast } from "../../components/shared/toast";
import { useToast } from "../../hooks/useToast";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { useSaveBankQuestion } from "../../hooks/useSaveBankQuestion";
import { useAuthStore } from "../../store/useAuthStore";
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
  const { questions, tags, isLoading, error, refetch } = useQuestionBank();
  const { saveQuestion, isSaving, error: saveError } = useSaveBankQuestion();
  const { toast, showToast, dismissToast } = useToast();

  const [search, setSearch] = useState(""); // teacher-typed search text
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]); // tags currently filtering the table
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([]); // tags as they exist on the server, for diffing on save
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "multiple-choice" | "coding">("all"); // narrows the table by type
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false); // shows the type-choice modal
  const [newTagNameInEditor, setNewTagNameInEditor] = useState(""); // teacher-typed tag name, while editing a question

  const [editingQuestion, setEditingQuestion] = useState<BuilderQuestion | null>(null); // null = showing the table
  const [editingTagIds, setEditingTagIds] = useState<string[]>([]); // tags attached to the question being edited

  // true only for a question that hasn't been saved to the bank yet
  const isNewQuestion = editingQuestion != null && !questions.some((q) => q.id === editingQuestion.id);

  // narrows the table down by typed search text and any active tag filters
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
      const matchesTags =
        activeTagIds.length === 0 || activeTagIds.every((tagId) => q.tags.some((t) => t.id === tagId));
      const matchesType = activeTypeFilter === "all" || q.type === activeTypeFilter; // combines with search and tags
      return matchesSearch && matchesTags && matchesType;
    });
  }, [questions, search, activeTagIds, activeTypeFilter]);

  // toggles one tag chip on/off in the filter row
  const toggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  // creates a tag directly from inside the editor, same behavior as the table's tag creation
  const handleCreateTagInEditor = async () => {
    const trimmed = newTagNameInEditor.trim();
    if (!trimmed || !teacherId) return; // ignore empty submissions
    try {
      await createBankTag(teacherId, trimmed);
      setNewTagNameInEditor("");
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create tag.", "error");
    }
  };

  // permanently deletes a tag everywhere it's used — confirms first, since this can't be undone
  const handleDeleteTag = async (tagId: string) => {
    const confirmed = window.confirm(
      "Delete this tag? It will be removed from every question that uses it. This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteBankTag(tagId);
      setEditingTagIds((prev) => prev.filter((id) => id !== tagId));
      setOriginalTagIds((prev) => prev.filter((id) => id !== tagId)); // keep the diff baseline honest
      setActiveTagIds((prev) => prev.filter((id) => id !== tagId));
      showToast("Tag deleted.", "success");
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete tag.", "error");
    }
  };

  // opens the editor for an existing bank question, fetching its full data
  const handleSelectQuestion = async (id: string) => {
    try {
      const question = await getBankQuestionById(id);
      setEditingQuestion(question);
      const row = questions.find((q) => q.id === id);
      const tagIds = row?.tags.map((t) => t.id) ?? [];
      setEditingTagIds(tagIds); // pending selection, starts equal to saved state
      setOriginalTagIds(tagIds); // snapshot to diff against when saving
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load this question.", "error");
    }
  };

  // starts a brand new blank question in the editor, not yet saved
  const handleCreateNew = (type: QuestionType) => {
    const blank =
      type === "multiple-choice"
        ? createBlankMCQuestion(crypto.randomUUID(), 0)
        : createBlankCodingQuestion(crypto.randomUUID(), 0);
    setEditingQuestion(blank);
    setEditingTagIds([]); // no tags yet — pending selection starts empty
    setOriginalTagIds([]); // nothing saved yet either
  };

  // returns to the table view without saving
  const handleBackToList = () => setEditingQuestion(null);

  // saves the question currently open in the editor, shows a toast either way
  // saves the question, then applies any pending tag changes, all in one action
  const handleSave = async () => {
    if (!editingQuestion) return;
    const didSave = await saveQuestion(editingQuestion);
    if (!didSave) {
      showToast(saveError ?? "Could not save this question.", "error");
      return;
    }

    // figure out which tags were added or removed since this question was loaded
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
    } catch (err) {
      // question itself saved fine, but a tag link failed — say so precisely
      showToast(
        err instanceof Error ? `Question saved, but tags failed: ${err.message}` : "Question saved, but tags failed to update.",
        "error",
      );
    }
  };

  // permanently removes a bank question
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

  // attaches or detaches a tag on the question currently being edited
  // toggles a tag in the pending selection only — nothing persists until Save Question
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
              {/* Editor top bar */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-base-content)", opacity: 0.7 }}
                >
                  <ArrowLeft size={15} />
                  Back to Question Bank
                </button>
                <div className="flex items-center gap-3">
                  {!isNewQuestion && (
                    <button
                      onClick={() => handleDelete(editingQuestion.id)}
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

              {/* Tag assignment — pending until Save Question is clicked, same as every other field */}
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
                      onClick={() => handleToggleQuestionTag(tag.id)} // pending only, applied on Save Question
                      className="cursor-pointer border-none bg-transparent p-0 text-inherit"
                    >
                      {tag.name}
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)} // this one IS immediate — deletes the tag everywhere
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
          ) : (
            <>
              <p className="text-xs opacity-60 mb-2">Teacher Portal &gt; Question Bank</p>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Question Bank</h1>
                  <p className="text-sm opacity-70 max-w-md leading-relaxed">
                    Browse, search, and reuse questions across multiple exams.
                  </p>
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

              {/* Search bar */}
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

              {/* Type filter — combines with search and tag filters below */}
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

              {/* Tag filters + inline tag creation */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
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
                          className="cursor-pointer hover:bg-black/[0.02]"
                        >
                          <td className="py-3.5 px-5 text-[14px] border-b border-[var(--color-base-300)]">{q.title}</td>
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
                            No questions match your search or filters.
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

      <Toast toast={toast} onDismiss={dismissToast} />
      <NewQuestionModal
        isOpen={showNewQuestionModal}
        onClose={() => setShowNewQuestionModal(false)}
        onSelectType={(type) => {
          setShowNewQuestionModal(false);
          handleCreateNew(type);
        }}
      />
    </div>
  );
}