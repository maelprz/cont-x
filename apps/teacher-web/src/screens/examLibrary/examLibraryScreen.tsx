import { useState } from "react";
import { Plus } from "lucide-react";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ExamCardTile } from "../../components/examLibrary/examCardTile";
import { ExamCardMenu } from "../../components/examLibrary/examCardMenu";
import { ConfirmActionDialog } from "../../components/shared/confirmActionDialog";
import { SubjectTile } from "../../components/shared/subjectTile";
import { PublishSuccessOverlay } from "../../components/examLibrary/publishSuccessOverlay";
import { SetSessionCodeModal } from "../../components/examLibrary/setSessionCodeModal";
import { EditSettingsModal } from "../../components/examLibrary/editSettingsModal";
import { CreateExamModal } from "../../components/examLibrary/createExamModal";
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

export function ExamLibraryScreen() {
  const [search, setSearch] = useState("");

  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const { exams, isLoading: isLoadingExams, refetch } = useExamLibrary();

  // The library now has two levels: subjects first, then the exams under the
  // chosen subject. Which subject is open lives in a store so returning from
  // the builder lands back in the same subject.
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
  const setCurrentClassExamIdResult = useExamResultsStore((state) => state.setCurrentClassExamId);
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
      navigateTo("examBuilder");
    }
  };

  // the search box means different things on each level, so clear it when switching
  const openSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSearch("");
  };
  const backToSubjects = () => {
    setSelectedSubjectId(null);
    setSearch("");
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
    classExamId: string,
    targetScreen: "violationMonitoring" | "examResults",
    examId: string,
  ) => {
    if (targetScreen === "examResults") {
      setCurrentClassExamIdResult(classExamId); // results are shown for this one class
    } else {
      setCurrentExamIdViolation(examId);
    }
    navigateTo(targetScreen);
  };

  const query = search.toLowerCase();

  // top level: subjects matching the search
  const filteredSubjects = subjects.filter((s) => s.name.toLowerCase().includes(query));

  // inside a subject: only that subject's exams, matching the search
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
          <p className="text-[13px] mb-3 opacity-60">
            Teacher Portal &gt;{" "}
            {selectedSubject ? (
              <>
                <button
                  onClick={backToSubjects}
                  className="p-0 border-none bg-transparent cursor-pointer text-inherit text-[13px] hover:underline"
                >
                  Exam Library
                </button>{" "}
                &gt; {selectedSubject.name}
              </>
            ) : (
              "Exam Library"
            )}
          </p>

          <div className="flex items-end justify-between gap-6 mb-7">
            <div>
              <h1 className="text-2xl font-bold">
                {selectedSubject ? selectedSubject.name : "Exam Library"}
              </h1>
              <p className="text-sm opacity-70 mt-1">
                {selectedSubject ? "Exams in this subject." : "Choose a subject to see its exams."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
                  placeholder={selectedSubject ? "Search exams by title or code" : "Search subjects"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-grow text-[13px] outline-none bg-transparent border-none text-[var(--color-base-content)] font-[inherit]"
                />
              </div>

              {selectedSubject?.isAssigned && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)]"
                >
                  <Plus size={14} />
                  New Exam
                </button>
              )}
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
            // ── Level 1: subjects ──────────────────────────────────────────
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
                  <SubjectTile
                    key={subject.id}
                    name={subject.name}
                    note={subject.isAssigned ? undefined : "You're no longer assigned to this subject."}
                    badge={
                      subject.liveClassCount > 0
                        ? `Live in ${subject.liveClassCount} ${subject.liveClassCount === 1 ? "class" : "classes"}`
                        : undefined
                    }
                    stats={[
                      { label: "Exams", value: subject.examCount },
                      { label: "Your classes", value: subject.classCount },
                    ]}
                    onClick={() => openSubject(subject.id)}
                  />
                ))}
              </div>
            )
          ) : (
          // ── Level 2: the exams under the chosen subject ────────────────
          filtered.length === 0 ? (
            <p className="text-[13px] opacity-60">
              {exams.some((e) => e.subjectId === selectedSubject.id)
                ? `No exams match "${search}".`
                : selectedSubject.isAssigned
                  ? "No exams in this subject yet. Use New Exam to create one."
                  : "No exams to show."}
            </p>
          ) : (
          <div className="grid grid-cols-3 gap-5">
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
                      hasClassAttachments={hasAttachments}
                      isProcessing={isProcessing}
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
          )
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