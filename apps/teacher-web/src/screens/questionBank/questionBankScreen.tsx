import { useState, useMemo } from "react";
import { Search, Plus, Tag as TagIcon, ArrowLeft, Trash2 } from "lucide-react";
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

export function QuestionBankScreen() {
  const teacherId = useAuthStore((state) => state.user?.id);
  const { questions, tags, isLoading, error, refetch } = useQuestionBank();
  const { saveQuestion, isSaving, error: saveError } = useSaveBankQuestion();
  const { toast, showToast, dismissToast } = useToast();

  const [search, setSearch] = useState(""); // teacher-typed search text
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]); // tags currently filtering the table
  const [newTagName, setNewTagName] = useState(""); // teacher-typed new tag name

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
      return matchesSearch && matchesTags;
    });
  }, [questions, search, activeTagIds]);

  // toggles one tag chip on/off in the filter row
  const toggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  // creates a brand new tag the teacher can use for filtering and tagging
  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || !teacherId) return; // ignore empty submissions
    try {
      await createBankTag(teacherId, trimmed);
      setNewTagName("");
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create tag.", "error");
    }
  };

  // opens the editor for an existing bank question, fetching its full data
  const handleSelectQuestion = async (id: string) => {
    try {
      const question = await getBankQuestionById(id);
      setEditingQuestion(question);
      const row = questions.find((q) => q.id === id);
      setEditingTagIds(row?.tags.map((t) => t.id) ?? []);
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
    setEditingTagIds([]);
  };

  // returns to the table view without saving
  const handleBackToList = () => setEditingQuestion(null);

  // saves the question currently open in the editor, shows a toast either way
  const handleSave = async () => {
    if (!editingQuestion) return;
    const didSave = await saveQuestion(editingQuestion);
    if (didSave) {
      showToast("Question saved to bank.", "success");
      await refetch();
      setEditingQuestion(null);
    } else {
      showToast(saveError ?? "Could not save this question.", "error");
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
  const handleToggleQuestionTag = async (tagId: string) => {
    if (!editingQuestion || isNewQuestion) return; // must be saved first
    const isLinked = editingTagIds.includes(tagId);
    try {
      if (isLinked) {
        await removeTagFromQuestion(editingQuestion.id, tagId);
        setEditingTagIds((prev) => prev.filter((id) => id !== tagId));
      } else {
        await addTagToQuestion(editingQuestion.id, tagId);
        setEditingTagIds((prev) => [...prev, tagId]);
      }
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update tag.", "error");
    }
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

              {/* Tag assignment — disabled until the question has been saved once */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <TagIcon size={14} style={{ opacity: 0.5 }} />
                {isNewQuestion ? (
                  <span className="text-[12px] opacity-50">Save this question first to add tags.</span>
                ) : (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleQuestionTag(tag.id)}
                      className="px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer border transition-opacity hover:opacity-80"
                      style={{
                        borderColor: editingTagIds.includes(tag.id) ? "var(--color-secondary)" : "var(--color-base-300)",
                        backgroundColor: editingTagIds.includes(tag.id) ? "var(--color-secondary)" : "transparent",
                        color: editingTagIds.includes(tag.id) ? "white" : "var(--color-base-content)",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))
                )}
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
                    onClick={() => handleCreateNew("multiple-choice")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-100)" }}
                  >
                    <Plus size={14} />
                    New MCQ
                  </button>
                  <button
                    onClick={() => handleCreateNew("coding")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                  >
                    <Plus size={14} />
                    New Coding Question
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
                <input
                  type="text"
                  placeholder="+ New tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                  className="px-3 py-1 rounded-full text-[12px] outline-none border border-dashed"
                  style={{ borderColor: "var(--color-base-300)", backgroundColor: "transparent", color: "var(--color-base-content)", width: 110 }}
                />
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
    </div>
  );
}