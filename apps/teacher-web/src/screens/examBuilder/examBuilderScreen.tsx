import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
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
  deleteSectionQuestions,
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
import { ExamConfirmDialog, examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";

export function ExamBuilderScreen({
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewRendered,
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
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [sectionDeletionError, setSectionDeletionError] = useState<string | null>(null);
  const [checkingSectionDeletion, setCheckingSectionDeletion] = useState(false);
  const [removedSectionContents, setRemovedSectionContents] = useState<{ questionIds: string[] } | null>(null);
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

  const [saveAction, setSaveAction] = useState<"draft" | "exam" | "leave" | null>(null);
  const saving = useRef(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null); // why the draft/saved status change failed
  const [leaveSaveError, setLeaveSaveError] = useState<string | null>(null);

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
    JSON.stringify(sections) !== JSON.stringify(savedSections) || removedSectionContents !== null || pendingBankSaveIds.size > 0;
  
  const { showToast } = useToast();

  // fills the builder with real questions once the exam finishes loading
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    // Older exams can have no sections, or items with no section. Use the first section
    // for those items and persist the assignment with the next exam save.
    const examSections = examData.sections.length ? examData.sections : [{ id: examData.id, title: "Section 1" }];
    const sectionIds = new Set(examSections.map((section) => section.id));
    const assignSection = <T extends { sectionId?: string | null },>(item: T): T =>
      item.sectionId && sectionIds.has(item.sectionId) ? item : { ...item, sectionId: examSections[0].id };
    const layout = applySectionLayout(examData.questions.map(assignSection), examData.pools.map(assignSection), examSections);
    const firstQuestion = layout.questions[0];
    setQuestions(layout.questions);
    setSavedQuestions(layout.questions); // snapshot of what's actually persisted
    setPools(layout.pools);
    setSavedPools(layout.pools);
    setSections(examSections);
    setSavedSections(examSections);
    setActiveSectionId(firstQuestion?.sectionId ?? examSections[0].id);
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
    if (!hasUnsavedChanges && !saveAction) {
      setNavigationGuard(null); // nothing to protect, let navigation happen freely
      return;
    }

    setNavigationGuard((nextScreen) => {
      if (saving.current) return;
      setLeaveSaveError(null);
      setPendingLeaveScreen(nextScreen);
    });

    return () => setNavigationGuard(null); // always clear on unmount or before the next effect run
  }, [hasUnsavedChanges, saveAction, setNavigationGuard]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges && !saving.current) return;
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

  // teacher chose to discard changes and leave anyway
  const handleLeaveWithoutSaving = () => {
    if (!pendingLeaveScreen || saving.current) return;
    setNavigationGuard(null);
    forceNavigateTo(pendingLeaveScreen);
    setPendingLeaveScreen(null);
  };

  // teacher chose to stay on this screen
  const handleCancelLeave = () => { if (!saving.current) setPendingLeaveScreen(null); };

  const sectionForNewItem = (): string | undefined => {
    if (activeSectionId && sections.some((s) => s.id === activeSectionId)) return activeSectionId;
    return sections[0]?.id;
  };

  const handleAddSection = () => {
    const created: BuilderSection = {
      id: crypto.randomUUID(),
      title: `Section ${sections.length + 1}`,
    };
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

  const sectionPendingRemoval = sections.find((section) => section.id === sectionToDelete);
  const sectionQuestions = questions.filter((question) => sectionToDelete !== null && question.sectionId === sectionToDelete);
  const sectionPools = pools.filter((pool) => sectionToDelete !== null && pool.sectionId === sectionToDelete);

  const requestDeleteSection = (id: string) => {
    if (openedFromEditExam || sections.length < 2) return;
    if (questions.some((question) => question.sectionId === id) || pools.some((pool) => pool.sectionId === id)) {
      setSectionDeletionError(null);
      setSectionToDelete(id);
      return;
    }

    setSections((prev) => prev.filter((section) => section.id !== id));
    if (activeSectionId === id) setActiveSectionId(activeQuestion?.sectionId ?? sections.find((section) => section.id !== id)?.id ?? null);
  };

  const confirmDeleteSection = async () => {
    if (!sectionPendingRemoval || openedFromEditExam || sections.length < 2 || checkingSectionDeletion) return;
    const hasContents = sectionQuestions.length > 0 || sectionPools.length > 0;
    if (hasContents && examData?.id) {
      setCheckingSectionDeletion(true);
      try {
        if (await countExamAttempts(examData.id) > 0) {
          setSectionDeletionError("This exam has student attempts. Move the questions and pools to another section first to preserve student work.");
          return;
        }
      } catch {
        setSectionDeletionError("Could not check for student attempts. Try again.");
        return;
      } finally {
        setCheckingSectionDeletion(false);
      }
    }

    const id = sectionPendingRemoval.id;
    const removedIds = new Set(sectionQuestions.map((question) => question.id));
    const remaining = questions.filter((question) => !removedIds.has(question.id));
    const remainingSections = sections.filter((section) => section.id !== id);
    setQuestions(remaining.map((question, index) => ({ ...question, number: index + 1 })));
    setPools((prev) => prev.filter((pool) => pool.sectionId !== id));
    setSections(remainingSections);
    setPendingBankSaveIds((prev) => new Set([...prev].filter((questionId) => !removedIds.has(questionId))));
    setBankOriginSnapshots((prev) => new Map([...prev].filter(([questionId]) => !removedIds.has(questionId))));
    if (sectionPools.some((pool) => pool.id === activePoolId)) setActivePoolId(null);
    const nextActive = remaining.find((question) => question.id === activeQuestion?.id) ?? remaining[0];
    setActiveId(nextActive?.id ?? "");
    setEditorTab(nextActive?.type ?? "multiple-choice");
    if (activeSectionId === id) setActiveSectionId(nextActive?.sectionId ?? remainingSections[0]?.id ?? null);
    if (hasContents) {
      setRemovedSectionContents((prev) => ({ questionIds: [...(prev?.questionIds ?? []), ...removedIds] }));
    }
    setSectionToDelete(null);
  };

  const handleMoveItemToSection = (
    kind: "question" | "pool",
    id: string,
    sectionId: string,
    placement?: { questionId: string; after: boolean },
  ) => {
    if (openedFromEditExam || !sections.some((section) => section.id === sectionId)) return;
    if (kind === "question") {
      setQuestions((previous) => {
        const moved = previous.find((question) => question.id === id);
        if (!moved) return previous;
        const next = previous.filter((question) => question.id !== id);
        const anchor = placement ? next.findIndex((question) => question.id === placement.questionId) : -1;
        const index = anchor < 0 ? next.length : anchor + (placement?.after ? 1 : 0);
        next.splice(index, 0, { ...moved, sectionId });
        return applySectionLayout(next.map((question, position) => ({ ...question, number: position + 1 })), [], sections).questions;
      });
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
    const sectionId = sectionForNewItem();
    if (!sectionId) return;
    const newQuestion =
      type === "multiple-choice"
        ? createBlankMCQuestion(crypto.randomUUID(), questions.length + 1)
        : type === "fill-in-the-blank"
          ? createBlankFitbQuestion(crypto.randomUUID(), questions.length + 1)
          : createBlankCodingQuestion(crypto.randomUUID(), questions.length + 1);

    newQuestion.sectionId = sectionId;
    setQuestions((prev) => [...prev, newQuestion]);
    setPendingBankSaveIds((prev) => new Set(prev).add(newQuestion.id)); // needs a bank copy on first save
    setActivePoolId(null);
    setActiveId(newQuestion.id);
    setEditorTab(newQuestion.type);
  };

  // runs once the modal finishes staging bank-selected questions — nothing is saved yet
  const handleQuestionsAddedFromBank = (pickedQuestions: BuilderQuestion[]) => {
    const targetSection = sectionForNewItem();
    if (!targetSection) return;
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
      const sectionId = sectionForNewItem();
      if (!sectionId) return;
      const newPool: BuilderPool = {
        id: crypto.randomUUID(),
        title: `Pool ${pools.length + 1}`,
        pickCount: target.pickCount,
        pointsPerQuestion: null,
        sectionId,
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
      topicIds: activeQuestion.topicIds,
      sourceBankQuestionId: activeQuestion.sourceBankQuestionId,
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

  // saves all questions to the exam (and any new ones to the bank) used by Save Draft and Save Exam
  const persistAllQuestions = async (): Promise<string | null> => {
    if (!examData?.id) return "Could not find this exam.";

    setSaveAllError(null);
    try {
      const sectionIds = new Set(sections.map((section) => section.id));
      if (!sections.length || [...questions, ...pools].some((item) => !item.sectionId || !sectionIds.has(item.sectionId))) {
        throw new Error("Keep at least one section and assign every question and pool to a section.");
      }
      if (pendingBankSaveIds.size && (!teacherId || !examData.subjectId)) {
        throw new Error("Could not find your account or exam subject to save new questions to the Question Bank.");
      }
      if (removedSectionContents && await countExamAttempts(examData.id) > 0) {
        throw new Error("This exam now has student attempts. Reopen the Builder to keep the section and its questions.");
      }
      await saveSections(examData.id, sections); // before questions and pools, which point at them
      for (const q of questions) {
        if (pendingBankSaveIds.has(q.id) && teacherId && examData.subjectId) {
          // Retries use the same bank ID so they can update the copy without duplicating it.
          await saveBankQuestion(teacherId, examData.subjectId, { ...q, id: bankIdFor(q.id) });
        }
        await persistExamQuestion(examData.id, q); // upserts this question into the exam
        setSavedQuestions((prev) => prev.some((saved) => saved.id === q.id)
          ? prev.map((saved) => saved.id === q.id ? q : saved)
          : [...prev, q]);
      }
      await savePools(examData.id, pools, questions.length); // random pools sit after the questions
      if (removedSectionContents) await deleteSectionQuestions(examData.id, removedSectionContents.questionIds);
      await deleteRemovedSections(examData.id, sections); // after everything has moved out of them
      setSavedQuestions(questions);
      setSavedPools(pools);
      setSavedSections(sections);
      setRemovedSectionContents(null);
      setPendingBankSaveIds((prev) => new Set([...prev].filter((id) => !questions.some((question) => question.id === id))));
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save all questions.";
      setSaveAllError(message);
      return message;
    }
  };

  const { saveDraft, saveExam } = useUpdateExamStatus();

  const handleSave = async (action: "draft" | "exam" | "leave") => {
    if (saving.current || isDeleting || !examData?.id) return;
    const destination = action === "leave" ? pendingLeaveScreen : "examLibrary";
    if (!destination) return;

    saving.current = true;
    setSaveAction(action);
    setLeaveSaveError(null);
    setStatusError(null);
    setSaveAllError(null);
    try {
      if (!(await confirmRescaleIfNeeded(questions))) return;
      const saveProblem = await persistAllQuestions();
      if (saveProblem) throw new Error(saveProblem);

      const saveAsExam = action === "exam" || (action === "leave" && isAlreadySaved);
      const statusProblem = await (saveAsExam ? saveExam(examData.id) : saveDraft(examData.id));
      if (statusProblem) {
        setStatusError(statusProblem);
        throw new Error(statusProblem);
      }

      showToast(saveAsExam ? (openedFromEditExam ? "Exam updated." : "Exam saved.") : "Draft saved.", "success");
      if (destination === "examLibrary") setLibrarySubject(examData.subjectId);
      setNavigationGuard(null);
      forceNavigateTo(destination);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the exam. Try again.";
      if (action === "leave") setLeaveSaveError(message);
      showToast(message, "error");
    } finally {
      saving.current = false;
      setSaveAction(null);
    }
  };

  return (
    <div
      className="flex h-dvh overflow-hidden text-[var(--color-base-content)]"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      <TeacherSidebar activeItem="examLibrary" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TeacherHeader title={examData?.title || "Exam Builder"} />

        <header className="shrink-0 border-b border-[var(--color-base-300)] bg-[var(--color-base-100)] px-4 py-3 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className={`${examSecondary} shrink-0`} disabled={!!saveAction} onClick={() => {
              if (examData) setLibrarySubject(examData.subjectId);
              navigateTo("examLibrary");
            }}>
              <ArrowLeft size={15} aria-hidden="true" /> Exam Library
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              {!isAlreadySaved && <button type="button" className={examSecondary} onClick={() => handleSave("draft")} disabled={!examData || isLoading || !!saveAction || isDeleting}>{saveAction === "draft" ? "Saving…" : "Save Draft"}</button>}
              <button type="button" className={examPrimary} onClick={() => handleSave("exam")} disabled={!examData || isLoading || !!saveAction || isDeleting}>{saveAction === "exam" ? "Saving…" : "Save Exam"}</button>
            </div>
          </div>
          {statusError && <p role="alert" className="mt-2 text-sm text-red-700">{statusError}</p>}
        </header>
        <div inert={!!saveAction} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
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
            onDeleteSection={requestDeleteSection}
            onMoveItemToSection={handleMoveItemToSection}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={handleAddQuestion}
            hideAddButton={openedFromEditExam || !sections.length}
          />

          <ExamBuilderEditorPanel
            subjectId={examData?.subjectId??null}
            isLoading={isLoading}
            error={error}
            activeQuestion={activeQuestion}
            editorTab={editorTab}

            saveAllError={saveAllError}
            deleteError={deleteError}
            isDeleting={isDeleting}


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
            onDeleteQuestion={() => handleDeleteQuestion(activeQuestion?.id ?? "")}
            onDiscard={handleDiscard}

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
      
      <ExamConfirmDialog
        isOpen={Boolean(sectionPendingRemoval)}
        title={`Delete ${sectionPendingRemoval?.title.trim() || "this section"}?`}
        message="Deleting this section removes all questions and random pools under it from this exam the next time you use Save draft or Save exam. Question Bank originals are kept."
        confirmLabel="Delete section"
        isProcessing={checkingSectionDeletion}
        error={sectionDeletionError}
        onConfirm={confirmDeleteSection}
        onCancel={() => setSectionToDelete(null)}
      />

      <ExamConfirmDialog
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
        isSaving={saveAction === "leave"}
        error={leaveSaveError}
        onSave={() => handleSave("leave")}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onCancel={handleCancelLeave}
      />

      {/* last, so it sits on top of the unsaved-changes prompt when Save & Leave triggers it */}
      <ExamConfirmDialog
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
        destructive={false}
        isProcessing={false}
        error={null}
        onConfirm={() => answerRescalePrompt(true)}
        onCancel={() => answerRescalePrompt(false)}
      />
    </div>
  );
}
