import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  QuestionType,
} from "./examBuilderScreen.types";
import { useExamBuilder } from "../../hooks/useExamBuilder";
import { useSaveQuestion } from "../../hooks/useSaveQuestion";
import { useDeleteQuestion } from "../../hooks/useDeleteQuestion";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { QuestionListPanel } from "../../components/examBuilder/questionListPanel";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";
import {createBlankMCQuestion, createBlankCodingQuestion} from "../../components/examBuilder/createBlankQuestion";

export function ExamBuilderScreen({
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewExam,
  onSaveExam,
  onPreviewRendered,
  onSaveAndContinue,
}: ExamBuilderScreenProps) {
  const { examData, isLoading, error } = useExamBuilder();

  const [questions, setQuestions] = useState<BuilderQuestion[]>(externalQuestions ?? []);
  const [activeId, setActiveId] = useState<string>(externalActiveId ?? "");

  // mirrors what's actually persisted, so Discard has something to revert to
  const [savedQuestions, setSavedQuestions] = useState<BuilderQuestion[]>(externalQuestions ?? []);

  // fills the builder with real questions once the exam finishes loading
  // replace the load effect to also capture the saved snapshot:
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    const firstQuestion = examData.questions[0];
    setQuestions(examData.questions);
    setSavedQuestions(examData.questions); // snapshot of what's actually persisted
    setActiveId(firstQuestion?.id ?? "");
    setEditorTab(firstQuestion?.type ?? "multiple-choice");
  }, [examData, externalQuestions]);

  const activeQuestion = questions.find((q) => q.id === activeId) ?? questions[0];
  const [editorTab, setEditorTab] = useState<QuestionType>(activeQuestion?.type ?? "multiple-choice");

  const handleAddQuestion = () => {
    // creates a new blank question and makes it the active one
    const newQuestion = createBlankMCQuestion(crypto.randomUUID(), questions.length + 1);

    setQuestions((prev) => [...prev, newQuestion]);
    setActiveId(newQuestion.id);
    setEditorTab("multiple-choice");
    onAddQuestion?.(); // still notify parent in case it needs to know
  };

  // add the discard handler
  const handleDiscard = () => {
    if (!activeQuestion) return; // nothing selected, nothing to discard

    const savedVersion = savedQuestions.find((q) => q.id === activeQuestion.id);

    // reverts to last save, or a blank template if this question was never saved
    const revertedQuestion: BuilderQuestion =
      savedVersion ??
      (activeQuestion.type === "multiple-choice"
        ? createBlankMCQuestion(activeQuestion.id, activeQuestion.number)
        : createBlankCodingQuestion(activeQuestion.id, activeQuestion.number));

    setQuestions((prev) => prev.map((q) => (q.id === revertedQuestion.id ? revertedQuestion : q)));
    setEditorTab(revertedQuestion.type); // matches the reverted question's actual type
    onDiscardQuestion?.();
  };

  const { deleteQuestion, isDeleting, error: deleteError } = useDeleteQuestion();

  const handleDeleteQuestion = async (id: string) => {
    if (!id) return; // nothing selected, nothing to delete

    const didDelete = await deleteQuestion(id);
    if (!didDelete) return;

    const deletedIndex = questions.findIndex((q) => q.id === id);
    const remaining = questions.filter((q) => q.id !== id);

    setQuestions(remaining);
    setSavedQuestions((prev) => prev.filter((q) => q.id !== id));

    const nextActive = remaining[deletedIndex] ?? null; // item that shifted into the deleted slot
    setActiveId(nextActive?.id ?? "");
    setEditorTab(nextActive?.type ?? "multiple-choice");

    onDeleteQuestion?.(id);
  };
  
  const handleSelectQuestion = (id: string) => {
    setActiveId(id);
    const q = questions.find((q) => q.id === id);
    if (q) setEditorTab(q.type);
    onSelectQuestion?.(id);
  };

  const handleQuestionChange = (updated: BuilderQuestion) =>
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));

  const handleTabSwitch = (tab: QuestionType) => {
    setEditorTab(tab);
    if (!activeQuestion || activeQuestion.type === tab) return;

    const base = {
      id: activeQuestion.id,
      number: activeQuestion.number,
      title: activeQuestion.title,
      points: activeQuestion.points,
      description: activeQuestion.description,
    };

    const converted: BuilderQuestion =
      tab === "multiple-choice"
        ? { ...base, type: "multiple-choice", options: [{ id: crypto.randomUUID(), text: "", isCorrect: true }, { id: crypto.randomUUID(), text: "", isCorrect: false }] }
        : { ...base, type: "coding", starterCode: "", testCases: [] , programType: "cProgram", mainCode: "", deductionPerAttempt: 0 };

    setQuestions((prev) => prev.map((q) => (q.id === converted.id ? converted : q)));
  };

  const { saveQuestion, isSaving, error: saveError } = useSaveQuestion();

  // saves the active question, then runs whatever the parent wants on continue
  const handleSaveAndContinue = async () => {
    if (!activeQuestion) return; // nothing selected, nothing to save
    const didSave = await saveQuestion(activeQuestion);
    if (didSave) {
      // this question is now the "last saved" version, for future Discards
      setSavedQuestions((prev) =>
        prev.some((q) => q.id === activeQuestion.id)
          ? prev.map((q) => (q.id === activeQuestion.id ? activeQuestion : q))
          : [...prev, activeQuestion],
      );
      onSaveAndContinue?.();
    }
  };

  const isMCQ = editorTab === "multiple-choice";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-base-200)" }}>
      <TeacherSidebar activeItem="examBuilder" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TeacherHeader />

        <div className="flex flex-1 overflow-hidden min-w-0">
          {/* Left: question list */}
          <QuestionListPanel
            questions={questions}
            activeId={activeId}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={handleAddQuestion}
            onReorderQuestions={onReorderQuestions}
          />

          {/* Right: editor */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Editor top bar */}
            <div
              className="flex items-start justify-between px-7 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <div>
                <h1 className="text-[24px] font-bold leading-tight mb-0.5" style={{ color: "var(--color-base-content)" }}>
                  Edit Question
                </h1>
                <p className="text-[13px]" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
                  {isMCQ
                    ? "Configure your multiple choice question and correct options."
                    : "Configure your coding challenge requirements and test cases."}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={onPreviewExam}
                  className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-100)" }}
                >
                  Preview Exam
                </button>
                <button
                  onClick={onSaveExam}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                >
                  Save Exam
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-7 py-5">
              {isLoading && (
                <p className="text-[13px]" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
                  Loading exam...
                </p>
              )}
              {error && (
                <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
                  {error}
                </p>
              )}

              {!isLoading && !error && (
                <>
                {/* Type toggle */}
                <div className="inline-flex rounded-lg p-0.5 mb-6" style={{ backgroundColor: "var(--color-base-300)" }}>
                  {(["multiple-choice", "coding"] as QuestionType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabSwitch(tab)}
                      className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                      style={{
                        backgroundColor: editorTab === tab ? "var(--color-base-100)" : "transparent",
                        color: editorTab === tab ? "var(--color-secondary)" : "var(--color-base-content)",
                        opacity: editorTab === tab ? 1 : 0.6,
                      }}
                    >
                      {tab === "multiple-choice" ? "Multiple Choice" : "Coding Question"}
                    </button>
                  ))}
                </div>

                {/* Editor panel */}
                {activeQuestion && (
                  isMCQ ? (
                    <MCQEditorPanel
                      question={
                        activeQuestion.type === "multiple-choice"
                          ? (activeQuestion as MCQBuilderQuestion)
                          : { ...activeQuestion, type: "multiple-choice", options: [] } as MCQBuilderQuestion
                      }
                      onChange={handleQuestionChange}
                      onPreviewRendered={onPreviewRendered}
                    />
                  ) : (
                    <CodingEditorPanel
                      question={
                        activeQuestion.type === "coding"
                          ? (activeQuestion as CodingBuilderQuestion)
                          : { ...activeQuestion, type: "coding", starterCode: "", filename: "main.py", testCases: [] , programType: "cProgram", mainCode: "", deductionPerAttempt: 0 } as CodingBuilderQuestion
                      }
                      onChange={handleQuestionChange}
                      onPreviewRendered={onPreviewRendered}
                    />
                  )
                )}
                </>
              )}
              
              {saveError && (
                <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
                  {saveError}
                </p>
              )}

              {deleteError && (
                <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
                  {deleteError}
                </p>
              )}
              
              {/* Bottom action row */}
              <div
                className="flex items-center justify-between mt-8 pt-5 border-t"
                style={{ borderColor: "var(--color-base-300)" }}
              >
                <button
                  onClick={() => handleDeleteQuestion(activeQuestion?.id ?? "")}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-error)", opacity: isDeleting ? 0.6 : 1 }}
                >
                  <Trash2 size={14} />
                  {isDeleting ? "Deleting..." : "Delete Question"}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDiscard}
                    className="px-5 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent" }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveAndContinue}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)", opacity: isSaving ? 0.6 : 1 }}
                  >
                    {isSaving ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}