import { useState, useEffect, useRef } from "react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  BuilderPool,
  BuilderSection,
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
import {
  saveQuestion as persistExamQuestion,
  savePools,
  saveSections,
  deleteRemovedSections,
  countExamAttempts,
} from "../../services/examBuilderService";
import { applySectionLayout } from "../../lib/sectionLayout";
import { findPointChanges } from "../../lib/pointChanges";
import type { PointChange } from "../../lib/pointChanges";
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
  createBlankFitbQuestion,
  starterCodeFor,
  mainCodeFor,
} from "../../components/examBuilder/createBlankQuestion";
import { useToast } from "../../hooks/useToast";
import { ConfirmActionDialog } from "../../components/shared/confirmActionDialog";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";

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
  const [poolToDelete, setPoolToDelete] = useState<string | null>(null); // asks before a pool is removed
  // exam sections (titled parts), tracked like pools: current + last saved
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [savedSections, setSavedSections] = useState<BuilderSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null); // where new questions and pools go
  // after saving, the library should open inside this exam's subject
  const setLibrarySubject = useExamLibraryStore((state) => state.setSelectedSubjectId);

  // tracks which questions are brand-new and need a bank copy saved before the exam can be saved
  const [pendingBankSaveIds, setPendingBankSaveIds] = useState<Set<string>>(new Set());
  // one bank id per new question, kept across retries so a retry updates the same bank copy
  // instead of creating a second one (which would take over the first copy's options/test cases)
  const bankIdByQuestionId = useRef<Map<string, string>>(new Map());
  const bankIdFor = (questionId: string): string => {
    const existing = bankIdByQuestionId.current.get(questionId);
    if (existing) return existing;
    const created = crypto.randomUUID();
    bankIdByQuestionId.current.set(questionId, created);
    return created;
  };

  // tracks the original bank version of each question, so we can revert to it if the user discards changes
  const [bankOriginSnapshots, setBankOriginSnapshots] = useState<Map<string, BuilderQuestion>>(new Map());

  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false); // true when the "+" modal is open

  const [isSavingQuestion, setIsSavingQuestion] = useState(false); // Save & Continue's own bank-write in flight
  const [bankSaveError, setBankSaveError] = useState<string | null>(null);

  const [isSavingDraftState, setIsSavingDraftState] = useState(false);
  const [isSavingExamState, setIsSavingExamState] = useState(false); // Save Draft / Save Exam's bulk persist in flight
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null); // why the draft/saved status change failed

  const [pendingLeaveScreen, setPendingLeaveScreen] = useState<ScreenName | null>(null); // where the user tried to go, while we ask them to confirm
  // asks before a points change rescales scores students already earned
  const [rescalePrompt, setRescalePrompt] = useState<{ changes: PointChange[]; attempts: number } | null>(null);
  const rescaleResolver = useRef<((confirmed: boolean) => void) | null>(null); // settles the save that is waiting on the answer
  const setNavigationGuard = useRouterLogic((state) => state.setNavigationGuard);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);

  // true whenever the in-memory question list differs from what's actually persisted
  const hasUnsavedChanges =
    JSON.stringify(questions) !== JSON.stringify(savedQuestions) ||
    JSON.stringify(pools) !== JSON.stringify(savedPools) ||
    JSON.stringify(sections) !== JSON.stringify(savedSections);
  
  const { showToast } = useToast();

  // fills the builder with real questions once the exam finishes loading
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    // with sections, questions are laid out in section order (and numbered to match) before
    // the saved snapshot is taken, so opening an exam never looks like it has unsaved changes
    const layout = applySectionLayout(examData.questions, examData.pools, examData.sections);
    const firstQuestion = layout.questions[0];
    setQuestions(layout.questions);
    setSavedQuestions(layout.questions); // snapshot of what's actually persisted
    setPools(layout.pools);
    setSavedPools(layout.pools);
    setSections(examData.sections);
    setSavedSections(examData.sections);
    setActiveSectionId(firstQuestion?.sectionId ?? examData.sections[0]?.id ?? null);
    setActiveId(firstQuestion?.id ?? "");
    setEditorTab(firstQuestion?.type ?? "multiple-choice");
  }, [examData, externalQuestions]);

  // keeps questions and pools in section order whenever sections or their contents change
  useEffect(() => {
    if (sections.length === 0) return;
    const next = applySectionLayout(questions, pools, sections);
    const numbersOf = (list: BuilderQuestion[]) => list.map((q) => `${q.id}:${q.number}`).join("|");
    if (numbersOf(next.questions) !== numbersOf(questions)) setQuestions(next.questions);
    if (next.pools.map((p) => p.id).join("|") !== pools.map((p) => p.id).join("|")) setPools(next.pools);
  }, [questions, pools, sections]);

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
  // A saved exam may already be in a class, so "Save Draft" must never push it back to draft
  // (the library would then hide Manage Classes for an exam that could even be live).
  // an exam that is in a class can never be a draft again, whatever its stored status says
  const isAlreadySaved = examData?.status === "saved" || (examData?.attachedClassCount ?? 0) > 0;
  const [editorTab, setEditorTab] = useState<QuestionType>(
    activeQuestion?.type ?? "multiple-choice",
  );

  // resolves true straight away unless a changed question already has attempts; then it asks first
  const confirmRescaleIfNeeded = async (toCheck: BuilderQuestion[]): Promise<boolean> => {
    if (!examData?.id) return true;
    const changes = findPointChanges(toCheck, questions, savedQuestions);
    if (changes.length === 0) return true; // no points changed, nothing to rescale

    let attempts = 0;
    try {
      attempts = await countExamAttempts(examData.id);
    } catch {
      return true; // the save itself will report a real problem
    }
    if (attempts === 0) return true; // nobody has answered yet

    return new Promise<boolean>((resolve) => {
      rescaleResolver.current = resolve;
      setRescalePrompt({ changes, attempts });
    });
  };

  // the teacher's answer to the rescale dialog lets the waiting save continue or stop
  const answerRescalePrompt = (confirmed: boolean) => {
    rescaleResolver.current?.(confirmed);
    rescaleResolver.current = null;
    setRescalePrompt(null);
  };

  // teacher chose to save first, then continue to wherever they were headed
  const handleSaveAndLeave = async () => {
    if (!pendingLeaveScreen || !examData?.id) return;
    if (!(await confirmRescaleIfNeeded(questions))) return; // stays on the unsaved-changes prompt

    setIsSavingDraftState(true);
    const saveProblem = await persistAllQuestions();
    if (saveProblem) {
      showToast(saveProblem, "error");
      setIsSavingDraftState(false);
      return;
    }

    setStatusError(null);
    const statusProblem = isAlreadySaved ? await saveExam(examData.id) : await saveDraft(examData.id);
    setIsSavingDraftState(false);
    if (statusProblem) {
      setStatusError(statusProblem);
      showToast(statusProblem, "error");
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

  // the section a new question or pool lands in: the one the teacher last opened (or the last one)
  const sectionForNewItem = (): string | null => {
    if (sections.length === 0) return null;
    if (activeSectionId && sections.some((s) => s.id === activeSectionId)) return activeSectionId;
    return sections[sections.length - 1].id;
  };

  // first click wraps everything already in the exam into "Section 1"; later clicks add an empty one
  const handleAddSection = () => {
    const created: BuilderSection = {
      id: crypto.randomUUID(),
      title: `Section ${sections.length + 1}`,
    };
    if (sections.length === 0) {
      setQuestions((prev) => prev.map((q) => ({ ...q, sectionId: created.id })));
      setPools((prev) => prev.map((p) => ({ ...p, sectionId: created.id })));
    }
    setSections((prev) => [...prev, created]);
    setActiveSectionId(created.id);
  };

  const handleRenameSection = (id: string, title: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));

  const handleMoveSection = (id: string, direction: -1 | 1) =>
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  // a section can only be deleted once it is empty, so no question is ever left without a home
  const handleDeleteSection = (id: string) => {
    const inUse = questions.some((q) => q.sectionId === id) || pools.some((p) => p.sectionId === id);
    if (inUse) {
      showToast("Move this section's questions to another section first.", "error");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
    setActiveSectionId((current) => (current === id ? null : current));
  };

  const handleMoveItemToSection = (kind: "question" | "pool", id: string, sectionId: string) => {
    if (kind === "question") {
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, sectionId } : q)));
    } else {
      setPools((prev) => prev.map((p) => (p.id === id ? { ...p, sectionId } : p)));
    }
    setActiveSectionId(sectionId);
  };

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
        : type === "fill-in-the-blank"
          ? createBlankFitbQuestion(crypto.randomUUID(), questions.length + 1)
          : createBlankCodingQuestion(crypto.randomUUID(), questions.length + 1);

    newQuestion.sectionId = sectionForNewItem(); // lands in the section the teacher is working in
    setQuestions((prev) => [...prev, newQuestion]);
    setPendingBankSaveIds((prev) => new Set(prev).add(newQuestion.id)); // needs a bank copy on first save
    setActivePoolId(null);
    setActiveId(newQuestion.id);
    setEditorTab(newQuestion.type);
  };

  // runs once the modal finishes staging bank-selected questions — nothing is saved yet
  const handleQuestionsAddedFromBank = (pickedQuestions: BuilderQuestion[]) => {
    const targetSection = sectionForNewItem();
    const newQuestions = pickedQuestions.map((q) => ({ ...q, sectionId: targetSection }));
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
        sectionId: sectionForNewItem(),
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

  const confirmDeletePool = () => {
    if (!poolToDelete) return;
    setPools((prev) => prev.filter((p) => p.id !== poolToDelete));
    setActivePoolId(null);
    setPoolToDelete(null);
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
        : activeQuestion.type === "fill-in-the-blank"
          ? createBlankFitbQuestion(activeQuestion.id, activeQuestion.number)
          : createBlankCodingQuestion(activeQuestion.id, activeQuestion.number));

    // a discard undoes edits to the question, not where the teacher put it in the exam
    const keptInSection: BuilderQuestion = { ...revertedQuestion, sectionId: activeQuestion.sectionId };
    setQuestions((prev) =>
      prev.map((q) => (q.id === keptInSection.id ? keptInSection : q)),
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
    if (q?.sectionId) setActiveSectionId(q.sectionId);
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
      sectionId: activeQuestion.sectionId,
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
        : tab === "fill-in-the-blank"
        ? {
            ...base,
            type: "fill-in-the-blank",
            acceptedAnswers: [{ id: crypto.randomUUID(), text: "" }],
            caseSensitive: false,
            ignoreExtraSpaces: true,
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
    if (!activeQuestion || !examData?.id) return; // nothing selected, nothing to save
    if (!(await confirmRescaleIfNeeded([activeQuestion]))) return;

    const isNewQuestion = pendingBankSaveIds.has(activeQuestion.id);

    setIsSavingQuestion(true);
    setBankSaveError(null);
    try {
      if (isNewQuestion && teacherId && examData?.subjectId) {
        await saveBankQuestion(teacherId, examData.subjectId, { ...activeQuestion, id: bankIdFor(activeQuestion.id) });
        setPendingBankSaveIds((prev) => {
          const next = new Set(prev);
          next.delete(activeQuestion.id);
          return next;
        });
      }

      await saveSections(examData.id, sections); // the question points at its section, so that row must exist first

      // Write it into the exam too. This used to only mark the question as "saved" in memory,
      // which switched off the unsaved-changes warning while nothing had reached the database.
      await persistExamQuestion(examData.id, activeQuestion);

      setSavedQuestions((prev) =>
        prev.some((q) => q.id === activeQuestion.id)
          ? prev.map((q) => (q.id === activeQuestion.id ? activeQuestion : q))
          : [...prev, activeQuestion],
      );
      showToast(isNewQuestion ? "Question saved to the exam and your question bank." : "Question saved.", "success");
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
  const persistAllQuestions = async (): Promise<string | null> => {
    if (!examData?.id) return "Could not find this exam.";

    setSaveAllError(null);
    try {
      await saveSections(examData.id, sections); // before questions and pools, which point at them
      for (const q of questions) {
        if (pendingBankSaveIds.has(q.id) && teacherId && examData.subjectId) {
          // reusable copy in this exam's subject bank, first time only
          await saveBankQuestion(teacherId, examData.subjectId, { ...q, id: bankIdFor(q.id) });
          // clear it right away so a retry after a later failure doesn't save a second copy
          setPendingBankSaveIds((prev) => {
            const next = new Set(prev);
            next.delete(q.id);
            return next;
          });
        }
        await persistExamQuestion(examData.id, q); // upserts this question into the exam
      }
      await savePools(examData.id, pools, questions.length); // random pools sit after the questions
      await deleteRemovedSections(examData.id, sections); // after everything has moved out of them
      setSavedQuestions(questions);
      setSavedPools(pools);
      setSavedSections(sections);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save all questions.";
      setSaveAllError(message);
      return message;
    }
  };

  const { saveDraft, saveExam } = useUpdateExamStatus();

  // quick save — persists all question edits, marks the exam as draft, returns to the library
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!(await confirmRescaleIfNeeded(questions))) return false;
    setIsSavingDraftState(true);
    const saveProblem = await persistAllQuestions();
    if (saveProblem || !examData?.id) {
      showToast(saveProblem ?? "Could not save draft.", "error");
      setIsSavingDraftState(false); // was left on, so the button stayed stuck on "Saving..."
      return false;
    }

    setStatusError(null);
    const statusProblem = await saveDraft(examData.id);
    setIsSavingDraftState(false);

    if (!statusProblem) {
      showToast("Draft saved.", "success");
      setLibrarySubject(examData.subjectId);
      navigateTo("examLibrary");
      return true;
    }
    setStatusError(statusProblem);
    showToast(statusProblem, "error");
    return false;
  };

  const handleSaveExam = async (): Promise<boolean> => {
    if (!examData?.id) return false;
    if (!(await confirmRescaleIfNeeded(questions))) return false;

    setIsSavingExamState(true);
    const saveProblem = await persistAllQuestions();
    if (saveProblem) {
      showToast(saveProblem, "error");
      setIsSavingExamState(false);
      return false;
    }
    setStatusError(null);
    const statusProblem = await saveExam(examData.id);
    setIsSavingExamState(false);
    if (!statusProblem) {
      showToast(openedFromEditExam ? "Exam updated." : "Exam saved.", "success");
      setLibrarySubject(examData.subjectId);
      navigateTo("examLibrary");
      return true;
    }
    setStatusError(statusProblem);
    showToast(statusProblem, "error");
    return false;
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
            onSelectPool={(id) => {
              setActivePoolId(id);
              const pool = pools.find((p) => p.id === id);
              if (pool?.sectionId) setActiveSectionId(pool.sectionId);
            }}
            sections={sections}
            activeSectionId={activeSectionId}
            sectionsReadOnly={openedFromEditExam}
            onSelectSection={setActiveSectionId}
            onAddSection={handleAddSection}
            onRenameSection={handleRenameSection}
            onMoveSection={handleMoveSection}
            onDeleteSection={handleDeleteSection}
            onMoveItemToSection={handleMoveItemToSection}
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
            isSavingDraft={isSavingDraftState}
            isSavingExam={isSavingExamState}
            statusError={statusError}
            bankSaveError={bankSaveError}
            saveAllError={saveAllError}
            deleteError={deleteError}
            isDeleting={isDeleting}
            isSavingQuestion={isSavingQuestion}
            pendingBankSaveIds={pendingBankSaveIds}
            canSaveDraft={!isAlreadySaved}
            poolPanel={
              activePool ? (
                <PoolEditorPanel
                  pool={activePool}
                  readOnly={openedFromEditExam}
                  onChange={handlePoolChange}
                  onDelete={() => setPoolToDelete(activePool.id)}
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
      
      <ConfirmActionDialog
        isOpen={poolToDelete !== null}
        title="Delete this random pool?"
        message="Its questions stay in the question bank."
        confirmLabel="Delete Pool"
        isProcessing={false}
        error={null}
        onConfirm={confirmDeletePool}
        onCancel={() => setPoolToDelete(null)}
      />

      <UnsavedChangesPrompt
        isOpen={Boolean(pendingLeaveScreen)}
        onSave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onCancel={handleCancelLeave}
      />

      {/* last, so it sits on top of the unsaved-changes prompt when Save & Leave triggers it */}
      <ConfirmActionDialog
        isOpen={rescalePrompt !== null}
        title="Rescale existing scores?"
        message={
          rescalePrompt
            ? `Changing points rescales scores students have already earned. ${rescalePrompt.attempts} ${
                rescalePrompt.attempts === 1 ? "attempt" : "attempts"
              } across every class using this exam will change (${rescalePrompt.changes
                .map((change) => `${change.label}: ${change.from} to ${change.to}`)
                .join(", ")}). Manual adjustments are kept.`
            : ""
        }
        confirmLabel="Rescale and Save"
        isProcessing={false}
        error={null}
        onConfirm={() => answerRescalePrompt(true)}
        onCancel={() => answerRescalePrompt(false)}
      />
    </div>
  );
}