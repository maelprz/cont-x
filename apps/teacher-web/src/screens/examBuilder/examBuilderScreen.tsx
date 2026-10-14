import { useState, useEffect } from "react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  BuilderPool,
  PoolItem,
  QuestionType,
} from "./examBuilderScreen.types";
import type { ScreenName } from "../../router/route";
import { useExamBuilder } from "../../hooks/useExamBuilder";
import { useDeleteQuestion } from "../../hooks/useDeleteQuestion";
import { useUpdateExamStatus } from "../../hooks/useUpdateExamStatus";
import { useAuthStore } from "../../store/useAuthStore";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import { useRouterLogic } from "../../router/routerLogic";
import { saveBankQuestion } from "../../services/questionBankService";
import { saveQuestion as persistExamQuestion, savePools } from "../../services/examBuilderService";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { QuestionListPanel } from "../../components/examBuilder/questionListPanel";
import { QuestionBankModal } from "../../components/examBuilder/questionBankModal";
import type { PoolTarget } from "../../components/examBuilder/questionBankModal";
import { PoolEditorPanel } from "../../components/examBuilder/poolEditorPanel";
import { UnsavedChangesPrompt } from "../../components/examBuilder/unsavedChangesPrompt";
import { ExamBuilderEditorPanel } from "../../components/examBuilder/examBuilderEditorPanel";
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
  const openedFromEditExam = useExamBuilderStore(
    (state) => state.openedFromEditExam,
  );
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );
  const [activeId, setActiveId] = useState<string>(externalActiveId ?? "");

  // snapshot of the last confirmed save for each question — used to detect unsaved changes
  const [savedQuestions, setSavedQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );

  // random "pick N of M" pools, tracked the same way as questions: current + last saved
  const [pools, setPools] = useState<BuilderPool[]>([]);
  const [savedPools, setSavedPools] = useState<BuilderPool[]>([]);
  const [activePoolId, setActivePoolId] = useState<string | null>(null); // set while a pool (not a question) is open
  const [poolModalTargetId, setPoolModalTargetId] = useState<string | null>(null); // pool the bank picker should add to

  // tracks which questions are brand-new and need a bank copy saved before the exam can be saved
  const [pendingBankSaveIds, setPendingBankSaveIds] = useState<Set<string>>(new Set());

  // tracks the original bank version of each question, so we can revert to it if the user discards changes
  const [bankOriginSnapshots, setBankOriginSnapshots] = useState<Map<string, BuilderQuestion>>(new Map());

  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false); // true when the "+" modal is open

  const [isSavingQuestion, setIsSavingQuestion] = useState(false); // Save & Continue's own bank-write in flight
  const [bankSaveError, setBankSaveError] = useState<string | null>(null);

  const [isSavingDraftState, setIsSavingDraftState] = useState(false);
  const [isSavingExamState, setIsSavingExamState] = useState(false); // Save Draft / Save Exam's bulk persist in flight
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const [pendingLeaveScreen, setPendingLeaveScreen] = useState<ScreenName | null>(null); // where the user tried to go, while we ask them to confirm
  const setNavigationGuard = useRouterLogic((state) => state.setNavigationGuard);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);

  // true whenever the in-memory question list differs from what's actually persisted
  const hasUnsavedChanges =
    JSON.stringify(questions) !== JSON.stringify(savedQuestions) ||
    JSON.stringify(pools) !== JSON.stringify(savedPools);
  
  const { showToast } = useToast();

  // fills the builder with real questions once the exam finishes loading
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    const firstQuestion = examData.questions[0];
    setQuestions(examData.questions);
    setSavedQuestions(examData.questions); // snapshot of what's actually persisted
    setPools(examData.pools);
    setSavedPools(examData.pools);
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
  const activePool = pools.find((p) => p.id === activePoolId) ?? null;
  const [editorTab, setEditorTab] = useState<QuestionType>(
    activeQuestion?.type ?? "multiple-choice",
  );

  // teacher chose to save first, then continue to wherever they were headed
  const handleSaveAndLeave = async () => {
    if (!pendingLeaveScreen || !examData?.id) return;

    setIsSavingDraftState(true);
    const questionsOk = await persistAllQuestions();
    if (!questionsOk) {
      showToast(saveAllError ?? "Could not save changes.", "error");
      setIsSavingDraftState(false);
      return;
    }

    const didSave = await saveDraft(examData.id);
    setIsSavingDraftState(false);
    if (!didSave) {
      showToast(statusError ?? "Could not save changes.", "error");
      return;
    }

    setNavigationGuard(null);
    forceNavigateTo(pendingLeaveScreen);
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
    setPoolModalTargetId(null);
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
    setActivePoolId(null);
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
      setActivePoolId(null);
      setActiveId(newQuestions[0].id);
      setEditorTab(newQuestions[0].type);
    }
  };

  // random pool changes are staged locally like questions — Save Draft/Exam persists them
  const handlePoolItemsAdded = (target: PoolTarget, items: PoolItem[]) => {
    if (target.kind === "new") {
      const newPool: BuilderPool = {
        id: crypto.randomUUID(),
        title: `Pool ${pools.length + 1}`,
        pickCount: target.pickCount,
        pointsPerQuestion: null,
        items,
      };
      setPools((prev) => [...prev, newPool]);
      setActivePoolId(newPool.id);
    } else {
      setPools((prev) =>
        prev.map((p) => (p.id === target.poolId ? { ...p, items: [...p.items, ...items] } : p)),
      );
      setActivePoolId(target.poolId);
    }
  };

  const handlePoolChange = (updated: BuilderPool) =>
    setPools((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const handleDeletePool = (id: string) => {
    if (!window.confirm("Delete this random pool? Its questions stay in the question bank.")) return;
    setPools((prev) => prev.filter((p) => p.id !== id));
    setActivePoolId(null);
  };

  // reverts the active question to its last confirmed version, or a blank if it was never saved
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
    setActivePoolId(null);
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
            referenceSolution: "",
          };

    setQuestions((prev) =>
      prev.map((q) => (q.id === converted.id ? converted : q)),
    );
  };

  // saves the active question to the bank (if new) and updates the savedQuestions snapshot
  const handleSaveAndContinue = async () => {
    if (!activeQuestion) return; // nothing selected, nothing to save

    const isNewQuestion = pendingBankSaveIds.has(activeQuestion.id);

    setIsSavingQuestion(true);
    setBankSaveError(null);
    try {
      if (isNewQuestion && teacherId && examData?.subjectId) {
        await saveBankQuestion(teacherId, examData.subjectId, { ...activeQuestion, id: crypto.randomUUID() });
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

  // saves all questions to the exam (and any new ones to the bank) used by Save Draft and Save Exam
  const persistAllQuestions = async (): Promise<boolean> => {
    if (!examData?.id) return false;

    setSaveAllError(null);
    try {
      for (const q of questions) {
        if (pendingBankSaveIds.has(q.id) && teacherId && examData.subjectId) {
          // reusable copy in this exam's subject bank, first time only
          await saveBankQuestion(teacherId, examData.subjectId, { ...q, id: crypto.randomUUID() });
        }
        await persistExamQuestion(examData.id, q); // upserts this question into the exam
      }
      await savePools(examData.id, pools, questions.length); // random pools sit after the questions
      setSavedQuestions(questions);
      setSavedPools(pools);
      setPendingBankSaveIds(new Set());
      return true;
    } catch (err) {
      setSaveAllError(err instanceof Error ? err.message : "Could not save all questions.");
      return false;
    }
  };

  const {
    saveDraft,
    saveExam,
    error: statusError,
  } = useUpdateExamStatus();

  // quick save — persists all question edits, marks the exam as draft, returns to the library
  const handleSaveDraft = async (): Promise<boolean> => {
    setIsSavingDraftState(true);
    const questionsOk = await persistAllQuestions();
    if (!questionsOk || !examData?.id) {
      showToast(saveAllError ?? "Could not save draft.", "error");
      return false;
    }

    const didSave = await saveDraft(examData.id);
    setIsSavingDraftState(false);
    
    if (didSave) {
      showToast("Draft saved.", "success");
      navigateTo("examLibrary");
      return true;
    } else {
      showToast(statusError ?? "Could not save draft.", "error");
      return false;
    }
  };

  const handleSaveExam = async (): Promise<boolean> => {
    if (!examData?.id) return false;
    
    setIsSavingExamState(true);
    const questionsOk = await persistAllQuestions();
    if (!questionsOk) {
      showToast(saveAllError ?? "Could not save exam.", "error");
      setIsSavingExamState(false);
      return false;
    }
    const didSave = await saveExam(examData.id);
    setIsSavingExamState(false);
    if (didSave) {
      showToast(openedFromEditExam ? "Exam updated." : "Exam saved.", "success");
      navigateTo("examLibrary");
    } else {
      showToast(statusError ?? "Could not save exam.", "error");
    }
    return didSave;
  };

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
            activeId={activePoolId ? "" : activeId}
            pools={pools}
            activePoolId={activePoolId}
            onSelectPool={setActivePoolId}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={handleAddQuestion}
            onReorderQuestions={onReorderQuestions}
            hideAddButton={openedFromEditExam}
          />

          <ExamBuilderEditorPanel
            isLoading={isLoading}
            error={error}
            activeQuestion={activeQuestion}
            editorTab={editorTab}
            isMCQ={editorTab === "multiple-choice"}
            isSavingDraft={isSavingDraftState}
            isSavingExam={isSavingExamState}
            statusError={statusError}
            bankSaveError={bankSaveError}
            saveAllError={saveAllError}
            deleteError={deleteError}
            isDeleting={isDeleting}
            isSavingQuestion={isSavingQuestion}
            pendingBankSaveIds={pendingBankSaveIds}
            poolPanel={
              activePool ? (
                <PoolEditorPanel
                  pool={activePool}
                  readOnly={openedFromEditExam}
                  onChange={handlePoolChange}
                  onDelete={() => handleDeletePool(activePool.id)}
                  onAddQuestions={() => {
                    setPoolModalTargetId(activePool.id);
                    setShowQuestionBankModal(true);
                  }}
                />
              ) : undefined
            }
            onTabSwitch={handleTabSwitch}
            onQuestionChange={handleQuestionChange}
            onPreviewRendered={onPreviewRendered}
            onSaveDraft={handleSaveDraft}
            onSaveExam={handleSaveExam}
            onDeleteQuestion={() => handleDeleteQuestion(activeQuestion?.id ?? "")}
            onDiscard={handleDiscard}
            onSaveAndContinue={handleSaveAndContinue}
          />
        </div>
      </div>

      {/* Overlays */}
      <QuestionBankModal
        isOpen={showQuestionBankModal}
        subjectId={examData?.subjectId ?? null}
        startingNumber={questions.length}
        pools={pools}
        defaultPoolId={poolModalTargetId}
        onClose={() => {
          setShowQuestionBankModal(false);
          setPoolModalTargetId(null);
        }}
        onQuestionsAdded={handleQuestionsAddedFromBank}
        onPoolItemsAdded={handlePoolItemsAdded}
        onCreateNewQuestion={handleCreateNewQuestionFromModal}
      />
      
      <UnsavedChangesPrompt
        isOpen={Boolean(pendingLeaveScreen)}
        onSave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onCancel={handleCancelLeave}
      />
    </div>
  );
}