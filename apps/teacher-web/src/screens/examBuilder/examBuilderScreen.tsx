import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  QuestionType,
} from "./examBuilderScreen.types";
import type { ScreenName } from "../../router/route";
import { useExamBuilder } from "../../hooks/useExamBuilder";
import { useDeleteQuestion } from "../../hooks/useDeleteQuestion";
import { useUpdateExamStatus } from "../../hooks/useUpdateExamStatus";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouterLogic } from "../../router/routerLogic";
import { saveBankQuestion } from "../../services/questionBankService";
import { saveQuestion as persistExamQuestion } from "../../services/examBuilderService";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { QuestionListPanel } from "../../components/examBuilder/questionListPanel";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";
import { QuestionBankModal } from "../../components/examBuilder/questionBankModal";
import {
  createBlankMCQuestion,
  createBlankCodingQuestion,
  starterCodeFor,
  mainCodeFor,
} from "../../components/examBuilder/createBlankQuestion";
import { useToast } from "../../hooks/useToast";

export function ExamBuilderScreen({
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewRendered,
  onSaveAndContinue,
}: ExamBuilderScreenProps) {
  const { examData, isLoading, error } = useExamBuilder();
  const teacherId = useAuthStore((state) => state.user?.id);
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );
  const [activeId, setActiveId] = useState<string>(externalActiveId ?? "");

  // mirrors what's been locally "confirmed" via Save & Continue — used as the Discard baseline
  // for pre-existing/previously-confirmed questions. Actual exam persistence is separate (see below).
  const [savedQuestions, setSavedQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );

  // ids of brand-new questions (created via "+ Create New") that still need their one-time
  // reusable copy written to question_bank — cleared once that write succeeds.
  const [pendingBankSaveIds, setPendingBankSaveIds] = useState<Set<string>>(new Set());

  // snapshot of each bank-derived question exactly as it was when added — Discard always
  // reverts to this, regardless of any edits made afterward.
  const [bankOriginSnapshots, setBankOriginSnapshots] = useState<Map<string, BuilderQuestion>>(new Map());

  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false); // true when the "+" modal is open

  const [isSavingQuestion, setIsSavingQuestion] = useState(false); // Save & Continue's own bank-write in flight
  const [bankSaveError, setBankSaveError] = useState<string | null>(null);

  const [isSavingAllQuestions, setIsSavingAllQuestions] = useState(false); // Save Draft / Save Exam's bulk persist in flight
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const [pendingLeaveScreen, setPendingLeaveScreen] = useState<ScreenName | null>(null); // where the user tried to go, while we ask them to confirm
  const setNavigationGuard = useRouterLogic((state) => state.setNavigationGuard);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);

  // true whenever the in-memory question list differs from what's actually persisted
  const hasUnsavedChanges = JSON.stringify(questions) !== JSON.stringify(savedQuestions);
  
  const { showToast } = useToast();

  // fills the builder with real questions once the exam finishes loading
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    const firstQuestion = examData.questions[0];
    setQuestions(examData.questions);
    setSavedQuestions(examData.questions); // snapshot of what's actually persisted
    setActiveId(firstQuestion?.id ?? "");
    setEditorTab(firstQuestion?.type ?? "multiple-choice");
  }, [examData, externalQuestions]);

  // guard against leaving the screen with unsaved changes, both via in-app navigation and browser refresh/close
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setNavigationGuard(null); // nothing to protect, let navigation happen freely
      return;
    }

    setNavigationGuard((nextScreen) => setPendingLeaveScreen(nextScreen)); // intercept, ask first

    return () => setNavigationGuard(null); // always clear on unmount or before the next effect run
  }, [hasUnsavedChanges, setNavigationGuard]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = ""; // required for the browser's native confirm dialog to appear
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const activeQuestion =
    questions.find((q) => q.id === activeId) ?? questions[0];
  const [editorTab, setEditorTab] = useState<QuestionType>(
    activeQuestion?.type ?? "multiple-choice",
  );

  // teacher chose to save first, then continue to wherever they were headed
  const handleSaveAndLeave = async () => {
    const didSave = await handleSaveDraft(); // reuses the existing draft-save path, including its own toast
    // handleSaveDraft already navigates to examLibrary on success — if they were headed
    // somewhere else specifically, respect that instead once the save succeeds
    if (pendingLeaveScreen && pendingLeaveScreen !== "examLibrary") {
      setNavigationGuard(null);
      forceNavigateTo(pendingLeaveScreen);
    }
    setPendingLeaveScreen(null);
  };

  // teacher chose to discard changes and leave anyway
  const handleLeaveWithoutSaving = () => {
    if (!pendingLeaveScreen) return;
    setNavigationGuard(null);
    forceNavigateTo(pendingLeaveScreen);
    setPendingLeaveScreen(null);
  };

  // teacher chose to stay on this screen
  const handleCancelLeave = () => setPendingLeaveScreen(null);

  // opens the Question Bank modal instead of creating a blank question directly
  const handleAddQuestion = () => {
    setShowQuestionBankModal(true);
    onAddQuestion?.(); // still notify parent in case it needs to know
  };

  // starts a brand new blank question in the real editor — matches the old "+" flow exactly
  const handleCreateNewQuestionFromModal = (type: QuestionType) => {
    const newQuestion =
      type === "multiple-choice"
        ? createBlankMCQuestion(crypto.randomUUID(), questions.length + 1)
        : createBlankCodingQuestion(crypto.randomUUID(), questions.length + 1);

    setQuestions((prev) => [...prev, newQuestion]);
    setPendingBankSaveIds((prev) => new Set(prev).add(newQuestion.id)); // needs a bank copy on first save
    setActiveId(newQuestion.id);
    setEditorTab(newQuestion.type);
  };

  // runs once the modal finishes staging bank-selected questions — nothing is saved yet
  const handleQuestionsAddedFromBank = (newQuestions: BuilderQuestion[]) => {
    setQuestions((prev) => [...prev, ...newQuestions]);
    setBankOriginSnapshots((prev) => {
      const next = new Map(prev);
      newQuestions.forEach((q) => next.set(q.id, q)); // remember the bank content as-fetched, for Discard
      return next;
    });
    if (newQuestions.length > 0) {
      setActiveId(newQuestions[0].id);
      setEditorTab(newQuestions[0].type);
    }
  };

  // reverts the active question to: its bank original (if bank-derived), its last confirmed
  // save (if pre-existing/previously confirmed), or a blank template (if brand new, never confirmed).
  const handleDiscard = () => {
    if (!activeQuestion) return; // nothing selected, nothing to discard

    const bankOriginVersion = bankOriginSnapshots.get(activeQuestion.id);
    const savedVersion = savedQuestions.find((q) => q.id === activeQuestion.id);

    const revertedQuestion: BuilderQuestion =
      bankOriginVersion ??
      savedVersion ??
      (activeQuestion.type === "multiple-choice"
        ? createBlankMCQuestion(activeQuestion.id, activeQuestion.number)
        : createBlankCodingQuestion(activeQuestion.id, activeQuestion.number));

    setQuestions((prev) =>
      prev.map((q) => (q.id === revertedQuestion.id ? revertedQuestion : q)),
    );
    setEditorTab(revertedQuestion.type); // matches the reverted question's actual type
    onDiscardQuestion?.();
  };

  const {
    deleteQuestion,
    isDeleting,
    error: deleteError,
  } = useDeleteQuestion();

  const handleDeleteQuestion = async (id: string) => {
    if (!id) return; // nothing selected, nothing to delete

    const wasSaved = savedQuestions.some((q) => q.id === id); // only hit the DB if it's really there
    if (wasSaved) {
      const didDelete = await deleteQuestion(id);
      if (!didDelete) return;
    }

    const deletedIndex = questions.findIndex((q) => q.id === id);
    const remaining = questions.filter((q) => q.id !== id);

    setQuestions(remaining);
    setSavedQuestions((prev) => prev.filter((q) => q.id !== id));
    setPendingBankSaveIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBankOriginSnapshots((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

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
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q)),
    );

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

    // default coding format used when switching from MCQ into coding
    const defaultProgramType = "cProgram" as const;

    const converted: BuilderQuestion =
      tab === "multiple-choice"
        ? {
            ...base,
            type: "multiple-choice",
            options: [
              { id: crypto.randomUUID(), text: "", isCorrect: true },
              { id: crypto.randomUUID(), text: "", isCorrect: false },
            ],
          }
        : {
            ...base,
            type: "coding",
            starterCode: starterCodeFor(defaultProgramType),
            testCases: [],
            programType: defaultProgramType,
            mainCode: mainCodeFor(defaultProgramType),
            deductionPerAttempt: 0,
          };

    setQuestions((prev) =>
      prev.map((q) => (q.id === converted.id ? converted : q)),
    );
  };

  // saves a brand-new question's reusable bank copy (once), and marks it locally confirmed.
  // NEVER writes to the exam's questions table — that only happens via Save Draft / Save Exam.
  const handleSaveAndContinue = async () => {
    if (!activeQuestion) return; // nothing selected, nothing to save

    const isNewQuestion = pendingBankSaveIds.has(activeQuestion.id);

    setIsSavingQuestion(true);
    setBankSaveError(null);
    try {
      if (isNewQuestion && teacherId) {
        await saveBankQuestion(teacherId, { ...activeQuestion, id: crypto.randomUUID() });
        setPendingBankSaveIds((prev) => {
          const next = new Set(prev);
          next.delete(activeQuestion.id);
          return next;
        });
      }

      setSavedQuestions((prev) =>
        prev.some((q) => q.id === activeQuestion.id)
          ? prev.map((q) => (q.id === activeQuestion.id ? activeQuestion : q))
          : [...prev, activeQuestion],
      );
      showToast(isNewQuestion ? "Saved to Question Bank." : "Question updated.", "success");
      onSaveAndContinue?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this question to the bank.";
      setBankSaveError(message);
      showToast(message, "error");
    } finally {
      setIsSavingQuestion(false);
    }
  };


  // bulk-persists every current question into the exam — the ONLY place that writes to
  // the exam's questions table. Also catches any bank writes that were never confirmed individually.
  const persistAllQuestions = async (): Promise<boolean> => {
    if (!examData?.id) return false;

    setIsSavingAllQuestions(true);
    setSaveAllError(null);
    try {
      for (const q of questions) {
        if (pendingBankSaveIds.has(q.id) && teacherId) {
          await saveBankQuestion(teacherId, { ...q, id: crypto.randomUUID() }); // reusable copy, first time only
        }
        await persistExamQuestion(examData.id, q); // upserts this question into the exam
      }
      setSavedQuestions(questions); // now mirrors exactly what's persisted
      setPendingBankSaveIds(new Set());
      return true;
    } catch (err) {
      setSaveAllError(err instanceof Error ? err.message : "Could not save all questions.");
      return false;
    } finally {
      setIsSavingAllQuestions(false);
    }
  };

  const {
    saveDraft,
    saveExam,
    error: statusError,
  } = useUpdateExamStatus();

  // quick save — persists all question edits, marks the exam as draft, returns to the library
  const handleSaveDraft = async (): Promise<boolean> => {
    const questionsOk = await persistAllQuestions();
    if (!questionsOk || !examData?.id) {
      showToast(saveAllError ?? "Could not save draft.", "error");
      return false;
    }

    const didSave = await saveDraft(examData.id);
    if (didSave) {
      showToast("Draft saved.", "success");
      navigateTo("examLibrary");
      return true;
    } else {
      showToast(statusError ?? "Could not save draft.", "error");
      return false;
    }
  };

  // marks the exam as draft but not yet visible to students
  const handleSaveExam = async (): Promise<boolean> => {
    if (!examData?.id) return false;
    const questionsOk = await persistAllQuestions();
    if (!questionsOk) {
      showToast(saveAllError ?? "Could not save exam.", "error");
      return false;
    }
    const didSave = await saveExam(examData.id);
    if (didSave) {
      showToast("Exam saved.", "success");
      navigateTo("examLibrary");
    } else {
      showToast(statusError ?? "Could not save exam.", "error");
    }
    return didSave;
  };

  const isMCQ = editorTab === "multiple-choice";

  function UnsavedChangesPrompt() {
    if (!pendingLeaveScreen) return null;
    return (
      <div
        onClick={handleCancelLeave}
        className="fixed inset-0 flex items-center justify-center z-[60]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[380px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
        >
          <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
            Unsaved Changes
          </h2>
          <p className="text-[13px] mb-5 opacity-60" style={{ color: "var(--color-base-content)" }}>
            You have unsaved changes to this exam. Save before leaving?
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleSaveAndLeave}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
            >
              Save Changes
            </button>
            <button
              onClick={handleLeaveWithoutSaving}
              className="px-4 py-2.5 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--color-base-300)", color: "var(--color-error)", backgroundColor: "transparent" }}
            >
              Leave Without Saving
            </button>
            <button
              onClick={handleCancelLeave}
              className="px-4 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
              style={{ color: "var(--color-base-content)", opacity: 0.7 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
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
              className="relative flex items-start justify-between px-7 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <div>
                <h1
                  className="text-[24px] font-bold leading-tight mb-0.5"
                  style={{ color: "var(--color-base-content)" }}
                >
                  Edit Question
                </h1>
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-base-content)", opacity: 0.6 }}
                >
                  {isMCQ
                    ? "Configure your multiple choice question and correct options."
                    : "Configure your coding challenge requirements and test cases."}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingAllQuestions}
                  className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-60"
                  style={{
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                    backgroundColor: "var(--color-base-100)",
                  }}
                >
                  {isSavingAllQuestions ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={handleSaveExam}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-content)",
                  }}
                >
                  Save Exam
                </button>
              </div>
              {statusError && (
                <p
                  className="absolute top-full right-7 mt-2 text-[13px]"
                  style={{ color: "var(--color-error)" }}
                >
                  {statusError}
                </p>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-7 py-5">
              {isLoading && (
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-base-content)", opacity: 0.6 }}
                >
                  Loading exam...
                </p>
              )}
              {error && (
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-error)" }}
                >
                  {error}
                </p>
              )}

              {!isLoading && !error && (
                <>
                  {/* Type toggle */}
                  <div
                    className="inline-flex rounded-lg p-0.5 mb-6"
                    style={{ backgroundColor: "var(--color-base-300)" }}
                  >
                    {(["multiple-choice", "coding"] as QuestionType[]).map(
                      (tab) => (
                        <button
                          key={tab}
                          onClick={() => handleTabSwitch(tab)}
                          className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                          style={{
                            backgroundColor:
                              editorTab === tab
                                ? "var(--color-base-100)"
                                : "transparent",
                            color:
                              editorTab === tab
                                ? "var(--color-secondary)"
                                : "var(--color-base-content)",
                            opacity: editorTab === tab ? 1 : 0.6,
                          }}
                        >
                          {tab === "multiple-choice"
                            ? "Multiple Choice"
                            : "Coding Question"}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Editor panel */}
                  {activeQuestion &&
                    (isMCQ ? (
                      <MCQEditorPanel
                        question={
                          activeQuestion.type === "multiple-choice"
                            ? (activeQuestion as MCQBuilderQuestion)
                            : ({
                                ...activeQuestion,
                                type: "multiple-choice",
                                options: [],
                              } as MCQBuilderQuestion)
                        }
                        onChange={handleQuestionChange}
                        onPreviewRendered={onPreviewRendered}
                      />
                    ) : (
                      <CodingEditorPanel
                        question={
                          activeQuestion.type === "coding"
                            ? (activeQuestion as CodingBuilderQuestion)
                            : ({
                                ...activeQuestion,
                                type: "coding",
                                starterCode: starterCodeFor("cProgram"),
                                filename: "main.py",
                                testCases: [],
                                programType: "cProgram",
                                mainCode: mainCodeFor("cProgram"),
                                deductionPerAttempt: 0,
                              } as CodingBuilderQuestion)
                        }
                        onChange={handleQuestionChange}
                        onPreviewRendered={onPreviewRendered}
                      />
                    ))}
                </>
              )}

              {bankSaveError && (
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--color-error)" }}
                >
                  {bankSaveError}
                </p>
              )}

              {saveAllError && (
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--color-error)" }}
                >
                  {saveAllError}
                </p>
              )}

              {deleteError && (
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--color-error)" }}
                >
                  {deleteError}
                </p>
              )}

              {/* Bottom action row */}
              <div
                className="flex items-center justify-between mt-8 pt-5 border-t"
                style={{ borderColor: "var(--color-base-300)" }}
              >
                <button
                  onClick={() =>
                    handleDeleteQuestion(activeQuestion?.id ?? "")
                  }
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                  style={{
                    color: "var(--color-error)",
                    opacity: isDeleting ? 0.6 : 1,
                  }}
                >
                  <Trash2 size={14} />
                  {isDeleting ? "Deleting..." : "Delete Question"}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDiscard}
                    className="px-5 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                    style={{
                      borderColor: "var(--color-base-300)",
                      color: "var(--color-base-content)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveAndContinue}
                    disabled={isSavingQuestion}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-content)",
                      opacity: isSavingQuestion ? 0.6 : 1,
                    }}
                  >
                    {isSavingQuestion
                      ? "Saving..."
                      : activeQuestion && pendingBankSaveIds.has(activeQuestion.id)
                        ? "Save to Question Bank"
                        : "Save Edits"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Overlays */}
      <QuestionBankModal
        isOpen={showQuestionBankModal}
        startingNumber={questions.length}
        onClose={() => setShowQuestionBankModal(false)}
        onQuestionsAdded={handleQuestionsAddedFromBank}
        onCreateNewQuestion={handleCreateNewQuestionFromModal}
      />
      
      <UnsavedChangesPrompt />
    </div>
  );
}