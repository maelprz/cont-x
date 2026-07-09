import { useState } from "react";
import { Search, Plus, Check, Tag as TagIcon } from "lucide-react";
import { useQuestionBank } from "../../hooks/useQuestionBank";
import { getBankQuestionById } from "../../services/questionBankService";
import type { BuilderQuestion, QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";

export function QuestionBankModal({
  isOpen,
  startingNumber,
  onClose,
  onQuestionsAdded,
  onCreateNewQuestion,
}: {
  isOpen: boolean;
  startingNumber: number; // how many questions the exam already has, for numbering new ones
  onClose: () => void;
  onQuestionsAdded: (questions: BuilderQuestion[]) => void; // unsaved copies — parent stages them locally
  onCreateNewQuestion: (type: QuestionType) => void; // hands off to the exam builder's own editor
}) {
  const { questions: bankQuestions, tags, isLoading, error: bankError } = useQuestionBank();

  const [search, setSearch] = useState(""); // filters the bank list by title
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // bank ids chosen for multi-add
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "multiple-choice" | "coding">("all");
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null; // render nothing when the modal is closed

  const resetAndClose = () => {
    setSearch("");
    setSelectedIds(new Set());
    setSubmitError(null);
    setActiveTypeFilter("all");
    setActiveTagIds([]);
    onClose();
  };

  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeTypeFilter === "all" || q.type === activeTypeFilter;
    const matchesTags =
      activeTagIds.length === 0 || activeTagIds.every((tagId) => q.tags.some((t) => t.id === tagId));
    return matchesSearch && matchesType && matchesTags;
  });

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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

  // builds local, unsaved copies of the selected bank questions — nothing is written to the database here
  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return; // nothing chosen, nothing to do

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const idsArray = Array.from(selectedIds);
      const newExamQuestions: BuilderQuestion[] = [];

      for (let i = 0; i < idsArray.length; i++) {
        const bankQuestion = await getBankQuestionById(idsArray[i]); // read-only fetch, nothing persisted
        newExamQuestions.push({
          ...bankQuestion,
          id: crypto.randomUUID(), // fresh id — independent copy, not yet saved anywhere
          number: startingNumber + i + 1,
        });
      }

      onQuestionsAdded(newExamQuestions); // parent stages these locally — Save Draft/Exam persists them
      resetAndClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not load these questions.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
            >
              <Plus size={14} />
              Create New
            </button>
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

          {isLoading && <p className="text-[13px] opacity-60">Loading question bank...</p>}
          {bankError && <p className="text-[13px]" style={{ color: "var(--color-error)" }}>{bankError}</p>}

          <div className="flex flex-col gap-2">
            {filteredBankQuestions.map((q) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => toggleSelected(q.id)}
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
                    <p className="text-[14px] font-medium" style={{ color: "var(--color-base-content)" }}>{q.title}</p>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--color-base-300)" }}>
          <button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0 || isSubmitting}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            {isSubmitting ? "Adding..." : `Add Selected (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}