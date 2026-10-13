import { useState } from "react";
import { ArrowLeft, Filter, LayoutGrid } from "lucide-react";
import type { ExamLibraryScreenProps } from "./examLibraryScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ExamCardTile } from "../../components/examLibrary/examCardTile";
import { ExamCardMenu } from "../../components/examLibrary/examCardMenu";
import { ConfirmActionDialog } from "../../components/examLibrary/confirmActionDialog";
import { PublishSuccessOverlay } from "../../components/examLibrary/publishSuccessOverlay";
import { SetSessionCodeModal } from "../../components/examLibrary/setSessionCodeModal";
import { EditSettingsModal } from "../../components/examLibrary/editSettingsModal";
import { CreateExamModal } from "../../components/examLibrary/createExamModal";
import { CreateNewCard } from "../../components/examLibrary/createNewCard";
import { SubjectCardTile } from "../../components/examLibrary/subjectCardTile";
import { ManageClassesModal } from "../../components/examLibrary/manageClassesModal";
import { AttachClassModal } from "../../components/examLibrary/attachClassModal";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamLibrary } from "../../hooks/useExamLibrary";
import { useCreateExam } from "../../hooks/useCreateExam";
import { useExamCardActions } from "../../hooks/useExamCardActions";
import { useClassExamActions } from "../../hooks/useClassExamActions";
import { useLibrarySubjects } from "../../hooks/useLibrarySubjects";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";
import type { NewExamSettings } from "../../services/examBuilderService";
import { useExamResultsStore } from "../../store/useExamResultsStore";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore"; // sets which exam Violation Monitoring shows

type ConfirmAction =
  | { type: "endClassExam"; classExamId: string }
  | { type: "deleteExam"; examId: string };

export function ExamLibraryScreen({
  exams: examsProp,
  searchQuery: externalSearch,
  onSearchChange,
  onFilter,
  onToggleView,
  onCreateNewAssessment,
}: ExamLibraryScreenProps) {
  const [localSearch, setLocalSearch] = useState("");
  const search = externalSearch ?? localSearch;

  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const { exams: fetchedExams, isLoading: isLoadingExams, refetch } = useExamLibrary();
  const exams = examsProp ?? fetchedExams;

  const selectedSubjectId = useExamLibraryStore((state) => state.selectedSubjectId);
  const setSelectedSubjectId = useExamLibraryStore((state) => state.setSelectedSubjectId);
  const {
    subjects,
    isLoading: isLoadingSubjects,
    error: subjectsError,
  } = useLibrarySubjects(exams);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createExam, isCreating, error: createError } = useCreateExam();
  const setCurrentExamId = useExamBuilderStore((state) => state.setCurrentExamId);
  const setOpenedFromEditExam = useExamBuilderStore((state) => state.setOpenedFromEditExam);
  const setCurrentExamIdResult = useExamResultsStore((state) => state.setCurrentExamId);
  const setCurrentExamIdViolation = useViolationMonitoringStore((state) => state.setCurrentExamId);

  const { handleDelete, isProcessing: isDeleting, error: deleteError } = useExamCardActions();
  const {
    handlePublish,
    handleEnd,
    handleRemove,
    isProcessing: isClassExamProcessing,
    error: classExamError,
  } = useClassExamActions();

  const isProcessing = isDeleting || isClassExamProcessing;
  const actionError = deleteError ?? classExamError;

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [publishedCode, setPublishedCode] = useState<string | null>(null); // shown after a successful activation
  const [settingsClassExamId, setSettingsClassExamId] = useState<string | null>(null);
  const [manageClassesExamId, setManageClassesExamId] = useState<string | null>(null);
  const [attachClassExamId, setAttachClassExamId] = useState<string | null>(null);

  // exam awaiting a session code before its class attachment can go active
  const [activateTarget, setActivateTarget] = useState<{ classExamId: string; examCode: string } | null>(null);

  const manageClassesExam = exams.find((e) => e.id === manageClassesExamId) ?? null;

  const handleCreateExam = async (settings: NewExamSettings) => {
    const newExamId = await createExam(settings);
    if (newExamId) {
      setCurrentExamId(newExamId);
      setOpenedFromEditExam(false); // brand new exam, not editing a live one
      setIsCreateModalOpen(false);
      onCreateNewAssessment?.();
      navigateTo("examBuilder");
    }
  };

  const handleSearch = (q: string) => {
    setLocalSearch(q);
    onSearchChange?.(q);
  };

  // opens a subject to show its exams
  const openSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    handleSearch("");
  };
  const backToSubjects = () => {
    setSelectedSubjectId(null);
    handleSearch("");
  };

  const handleCardCta = (examId: string, status: "draft" | "saved", hasAttachments: boolean) => {
    if (status === "draft") {
      setCurrentExamId(examId);
      setOpenedFromEditExam(false); // still being authored, never attached to a class yet
      navigateTo("examBuilder");
      return;
    }
    if (hasAttachments) {
      setManageClassesExamId(examId);
    } else {
      setAttachClassExamId(examId);
    }
  };

  // tries to activate immediately; if this class has no session code yet, opens the prompt instead
  const requestActivate = async (classExamId: string, examCode: string) => {
    const result = await handlePublish(classExamId);
    if (result === "success") {
      setPublishedCode(examCode);
      refetch();
    } else if (result === "needsCode") {
      setActivateTarget({ classExamId, examCode });
    }
    // "error" case falls through — actionError is already set and shown via the existing banner
  };

  // runs after the teacher enters a code in the prompt — sets it and activates together
  const confirmActivateWithCode = async (code: string) => {
    if (!activateTarget) return;
    const result = await handlePublish(activateTarget.classExamId, code);
    if (result === "success") {
      setPublishedCode(activateTarget.examCode);
      setActivateTarget(null);
      refetch();
    }
    // "error" case: actionError is shown inside the modal itself, modal stays open
  };

  const requestEnd = (classExamId: string) => setConfirmAction({ type: "endClassExam", classExamId });
  const requestDelete = (examId: string) => setConfirmAction({ type: "deleteExam", examId });

  const confirmPendingAction = async () => {
    if (!confirmAction) return;
    const didSucceed =
      confirmAction.type === "endClassExam"
        ? await handleEnd(confirmAction.classExamId)
        : await handleDelete(confirmAction.examId);

    if (didSucceed) {
      setConfirmAction(null);
      refetch();
    }
  };

  const handleRemoveAttachment = async (classExamId: string) => {
    // low-risk action (only ever enabled for not-yet-live attachments) — no confirmation dialog
    const didSucceed = await handleRemove(classExamId);
    if (didSucceed) refetch();
  };

  const handleNavigateFromClassExam = (
    _classExamId: string,
    targetScreen: "violationMonitoring" | "examResults",
    examId: string,
  ) => {
    if (targetScreen === "examResults") {
      setCurrentExamIdResult(examId);
    } else {
      setCurrentExamIdViolation(examId);
    }
    navigateTo(targetScreen);
  };

  const query = search.toLowerCase();

  const filteredSubjects = subjects.filter((s) => s.name.toLowerCase().includes(query));

  const filtered = exams.filter(
    (e) =>
      e.subjectId === selectedSubject?.id &&
      (e.title.toLowerCase().includes(query) || e.code.toLowerCase().includes(query)),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      <TeacherSidebar activeItem="examLibrary" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader />

        <main
          className="flex-1 overflow-y-auto px-8 py-6"
          style={{ color: "var(--color-base-content)" }}
        >
          <p className="text-xs opacity-60 mb-2">
            Teacher Portal &gt;{" "}
            {selectedSubject ? (
              <>
                <button
                  onClick={backToSubjects}
                  className="p-0 border-none bg-transparent cursor-pointer text-inherit text-xs hover:underline"
                >
                  Exam Library
                </button>{" "}
                &gt; {selectedSubject.name}
              </>
            ) : (
              "Exam Library"
            )}
          </p>

          <div className="flex items-start justify-between gap-6 mb-7">
            <div>
              {selectedSubject && (
                <button
                  onClick={backToSubjects}
                  className="flex items-center gap-1.5 mb-2 p-0 border-none bg-transparent cursor-pointer text-[13px] font-medium text-[var(--color-base-content)] opacity-70 transition-opacity hover:opacity-100"
                >
                  <ArrowLeft size={14} />
                  All subjects
                </button>
              )}
              <h1 className="text-2xl font-bold mb-1">
                {selectedSubject ? selectedSubject.name : "Academic Inventory"}
              </h1>
              <p className="text-sm opacity-70 max-w-md leading-relaxed">
                {selectedSubject
                  ? "Exams under this subject. Build an exam once, then publish it to any of your classes in the subject."
                  : "Pick a subject to manage its exams and deploy them to your classes. Ensure rigor and academic integrity with Cont/x's structured exam environment."}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border w-[280px] border-[var(--color-base-300)] bg-[var(--color-base-100)]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  style={{ opacity: 0.5, flexShrink: 0 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder={selectedSubject ? "Search exams by title or code" : "Search subjects by name"}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-grow text-[13px] outline-none bg-transparent border-none text-[var(--color-base-content)] font-[inherit]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onFilter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-base-300)] text-[13px] text-[var(--color-base-content)] bg-[var(--color-base-100)] font-medium cursor-pointer transition-opacity hover:opacity-70"
                >
                  <Filter size={13} />
                  Filter
                </button>
                <button
                  onClick={onToggleView}
                  className="p-2 rounded-lg border border-[var(--color-base-300)] text-[var(--color-base-content)] bg-[var(--color-base-100)] cursor-pointer transition-opacity hover:opacity-70"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {actionError && (
            <p
              className="text-[13px] mb-4"
              style={{ color: "var(--color-error)" }}
            >
              {actionError}
            </p>
          )}

          {!selectedSubject ? (
            isLoadingSubjects || isLoadingExams ? (
              <p className="text-[13px] opacity-60">Loading subjects...</p>
            ) : subjectsError ? (
              <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
                {subjectsError}
              </p>
            ) : subjects.length === 0 ? (
              <p className="text-[13px] opacity-60">
                You aren't assigned to any subjects yet. Ask an admin to assign you one, and it
                will show up here.
              </p>
            ) : filteredSubjects.length === 0 ? (
              <p className="text-[13px] opacity-60">No subjects match "{search}".</p>
            ) : (
              <div className="grid grid-cols-3 gap-5">
                {filteredSubjects.map((subject) => (
                  <SubjectCardTile
                    key={subject.id}
                    subject={subject}
                    onClick={() => openSubject(subject.id)}
                  />
                ))}
              </div>
            )
          ) : (
          <div className="grid grid-cols-3 gap-5">
            {selectedSubject.isAssigned && (
              <CreateNewCard onClick={() => setIsCreateModalOpen(true)} />
            )}
            {filtered.map((exam) => {
              const hasAttachments = exam.classAttachments.length > 0;
              const hasActiveAttachment = exam.classAttachments.some((a) => a.status === "active");

              return (
                <ExamCardTile
                  key={exam.id}
                  exam={{
                    ...exam,
                    onCta: () => handleCardCta(exam.id, exam.status, hasAttachments),
                  }}
                  onClick={() => handleCardCta(exam.id, exam.status, hasAttachments)}
                  menu={
                    <ExamCardMenu
                      status={exam.status}
                      hasClassAttachments={hasAttachments}
                      isProcessing={isProcessing}
                      onManageClasses={() => handleCardCta(exam.id, exam.status, hasAttachments)}
                      onDelete={() => requestDelete(exam.id)}
                      onEditExam={() => {
                        setCurrentExamId(exam.id);
                        setOpenedFromEditExam(hasActiveAttachment);
                        navigateTo("examBuilder");
                      }}
                    />
                  }
                />
              );
            })}
          </div>
          )}
        </main>
      </div>

      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateExam}
        isSubmitting={isCreating}
        error={createError}
        fixedSubject={selectedSubject?.isAssigned ? { id: selectedSubject.id, name: selectedSubject.name } : null}
      />

      <ConfirmActionDialog
        isOpen={confirmAction !== null}
        title={confirmAction?.type === "endClassExam" ? "End this class's exam?" : "Delete this exam?"}
        message={
          confirmAction?.type === "endClassExam"
            ? "Students in this class will no longer be able to join or submit answers."
            : "This permanently removes the exam and all of its questions."
        }
        confirmLabel={confirmAction?.type === "endClassExam" ? "End Exam" : "Delete Exam"}
        isProcessing={isProcessing}
        error={actionError}
        onConfirm={confirmPendingAction}
        onCancel={() => setConfirmAction(null)}
      />

      <ManageClassesModal
        isOpen={manageClassesExamId !== null}
        exam={manageClassesExam}
        isProcessing={isProcessing}
        error={actionError}
        onClose={() => setManageClassesExamId(null)}
        onAttachNew={() => manageClassesExamId && setAttachClassExamId(manageClassesExamId)}
        onActivate={(classExamId) =>
          manageClassesExam && requestActivate(classExamId, manageClassesExam.code)
        }
        onEnd={requestEnd}
        onRemove={handleRemoveAttachment}
        onEditSettings={(classExamId) => setSettingsClassExamId(classExamId)}
        onNavigate={(classExamId, targetScreen) =>
          manageClassesExamId && handleNavigateFromClassExam(classExamId, targetScreen, manageClassesExamId)
        }
      />

      <AttachClassModal
        isOpen={attachClassExamId !== null}
        examId={attachClassExamId}
        onClose={() => setAttachClassExamId(null)}
        onAttached={() => {
          // keep (or reopen) the management list so the new attachment is visible right away
          if (attachClassExamId) setManageClassesExamId(attachClassExamId);
          refetch();
        }}
      />

      {/* Overlay / Modals */}
      <EditSettingsModal
        isOpen={settingsClassExamId !== null}
        classExamId={settingsClassExamId}
        onClose={() => setSettingsClassExamId(null)}
        onSaved={refetch}
      />

      <PublishSuccessOverlay
        isOpen={publishedCode !== null}
        examCode={publishedCode ?? ""}
        onClose={() => setPublishedCode(null)}
      />

      <SetSessionCodeModal
        isOpen={activateTarget !== null}
        isProcessing={isProcessing}
        error={actionError}
        onCancel={() => setActivateTarget(null)}
        onConfirm={confirmActivateWithCode}
      />
    </div>
  );
}