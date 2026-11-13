import { useRef, useState } from "react";
import { ArrowRight, FileText, Plus, Search, Trash2, Users } from "lucide-react";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { ExamSubjectFilter } from "../../components/examLibrary/examSubjectFilter";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ClassExamStatusBadge, StatusBadge } from "../../components/examLibrary/statusBadge";
import { ExamConfirmDialog, examField, examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { PublishSuccessOverlay } from "../../components/examLibrary/publishSuccessOverlay";
import { SetSessionCodeModal } from "../../components/examLibrary/setSessionCodeModal";
import { EditSettingsModal } from "../../components/examLibrary/editSettingsModal";
import { CreateExamModal } from "../../components/examLibrary/createExamModal";
import { ManageClassesModal } from "../../components/examLibrary/manageClassesModal";
import { ReopenClassExamModal } from "../../components/examLibrary/reopenClassExamModal";
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
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore"; // sets which class exam Violation Monitoring shows

type ConfirmAction =
  | { type: "endClassExam"; classExamId: string }
  | { type: "deleteExam"; examId: string };

export function ExamLibraryScreen() {
  const [search, setSearch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const detailsRef = useRef<HTMLElement>(null);

  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const { exams, isLoading: isLoadingExams, error: examsError, refetch } = useExamLibrary();

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
  const setCurrentClassExamIdViolation = useViolationMonitoringStore((state) => state.setCurrentClassExamId);

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
  const [publishedCodes, setPublishedCodes] = useState<{ examCode: string; sessionCode: string; reopenedUntil?: string } | null>(null);
  const [reopenTarget, setReopenTarget] = useState<{ classExamId: string; examCode: string } | null>(null);
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

  const chooseSubject = (subjectId: string | null) => {
    setSelectedSubjectId(subjectId);
    setSelectedExamId(null);
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
    if (result.status === "success") {
      setPublishedCodes({ examCode, sessionCode: result.sessionCode });
      refetch();
    } else if (result.status === "needsCode") {
      setActivateTarget({ classExamId, examCode });
    }
    // "error" case falls through — actionError is already set and shown via the existing banner
  };

  // runs after the teacher enters a code in the prompt — sets it and activates together
  const confirmActivateWithCode = async (code: string) => {
    if (!activateTarget) return;
    const result = await handlePublish(activateTarget.classExamId, code);
    if (result.status === "success") {
      setPublishedCodes({ examCode: activateTarget.examCode, sessionCode: result.sessionCode });
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
    targetScreen: "studentMonitoring" | "examResults",
  ) => {
    if (targetScreen === "examResults") {
      setCurrentClassExamIdResult(classExamId); // results are shown for this one class
    } else {
      setCurrentClassExamIdViolation(classExamId); // progress is shown for this one class
    }
    navigateTo(targetScreen);
  };

  const query = search.trim().toLowerCase();
  const filtered = exams.filter((exam) =>
    (!selectedSubjectId || exam.subjectId === selectedSubjectId) &&
    (exam.title.toLowerCase().includes(query) || exam.code.toLowerCase().includes(query)),
  );
  const selectedExam = filtered.find((exam) => exam.id === selectedExamId) ?? filtered[0];
  const selectedExamSubject = subjects.find((subject) => subject.id === selectedExam?.subjectId);
  const canCreate = selectedSubject ? selectedSubject.isAssigned : subjects.some((subject) => subject.isAssigned);
  const isLoading = isLoadingSubjects || isLoadingExams;
  const loadError = subjectsError ?? examsError;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="examLibrary" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Exam Library" />
        <main className="flex min-h-0 flex-1 flex-col">
          <div role="group" aria-label="Exam library controls" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-base-300)] px-4 py-3 sm:px-6">
            <ExamSubjectFilter subjects={subjects} value={selectedSubjectId} onChange={chooseSubject} />
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
              <input aria-label="Search exams" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or code" className={`${examField} pl-9`} />
            </label>
            {canCreate && (
              <button type="button" className={`${examPrimary} ml-auto shrink-0`} onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} aria-hidden="true" /> New exam
              </button>
            )}
          </div>
          {actionError && <p role="alert" className="px-4 py-2 text-sm text-red-700 sm:px-7">{actionError}</p>}
          <div className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[minmax(300px,2fr)_minmax(0,3fr)] xl:overflow-hidden">
            <section aria-label="Exams" className="min-w-0 border-b border-[var(--color-base-300)] xl:flex xl:min-h-0 xl:flex-col xl:border-r xl:border-b-0">
              <div className="px-3 py-2 xl:min-h-0 xl:overflow-y-auto">
                {isLoading ? <p role="status" className="p-3 text-sm text-stone-600">Loading exams…</p>
                  : loadError && !exams.length ? <p role="alert" className="p-3 text-sm text-red-700">{loadError}</p>
                  : filtered.length ? (
                    <ul className="divide-y divide-stone-200">
                      {filtered.map((exam) => {
                        const subject = subjects.find((item) => item.id === exam.subjectId);
                        const live = exam.classAttachments.some((item) => item.status === "active");
                        const selected = selectedExam?.id === exam.id;
                        return (
                          <li key={exam.id} className="py-1">
                            <button type="button" aria-pressed={selected} onClick={() => {
                              setSelectedExamId(exam.id);
                              if (window.matchMedia("(width < 80rem)").matches) {
                                requestAnimationFrame(() => detailsRef.current?.focus());
                              }
                            }} className={`flex w-full items-start justify-between gap-3 rounded-md px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-[#465a3b] ${selected ? "bg-[#e9eee3]" : "hover:bg-stone-100"}`}>
                              <span className="min-w-0">
                                <span className="block break-words text-sm font-semibold">{exam.title}</span>
                                {subject && <span className="mt-1 block text-xs text-stone-600">{subject.name}</span>}
                              </span>
                              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                                <StatusBadge status={exam.status} subtle />
                                {live && <ClassExamStatusBadge status="active" subtle />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="p-3 text-sm text-stone-600">
                      {query ? `No exams match “${search.trim()}”.` : selectedSubject ? "No exams in this subject yet." : "No exams yet."}
                    </p>
                  )}
              </div>
            </section>
            <section ref={detailsRef} tabIndex={-1} aria-label="Exam details" className="min-w-0 bg-[var(--color-base-100)] p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] sm:p-7 xl:overflow-y-auto">
              {!isLoading && selectedExam && (
                <div className="max-w-3xl">
                  <div className="min-w-0">
                    {selectedExamSubject && <p className="mb-1 text-sm text-stone-600">{selectedExamSubject.name}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="break-words text-2xl font-semibold">{selectedExam.title}</h2>
                      <StatusBadge status={selectedExam.status} subtle />
                    </div>
                  </div>
                  {selectedExam.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{selectedExam.description}</p>}
                  <dl className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} aria-hidden="true" />
                      <dt className="sr-only">Questions</dt>
                      <dd>{selectedExam.questionCount} {selectedExam.questionCount === 1 ? "question" : "questions"}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} aria-hidden="true" />
                      <dt className="sr-only">Classes</dt>
                      <dd>{selectedExam.classAttachments.length} {selectedExam.classAttachments.length === 1 ? "class" : "classes"}</dd>
                    </div>
                    <div className="flex flex-wrap gap-2"><dt>Exam Code:</dt><dd className="tabular-nums">{selectedExam.code}</dd></div>
                    <div className="flex flex-wrap gap-2"><dt>Created:</dt><dd>{selectedExam.createdAt}</dd></div>
                  </dl>
                  {selectedExam.classAttachments.length > 0 && (
                    <div className="mt-5 border-t border-[var(--color-base-300)] pt-4">
                      <h3 className="text-sm font-semibold">Class delivery</h3>
                      <ul className="mt-2 divide-y divide-stone-200">
                        {selectedExam.classAttachments.map((item) => (
                          <li key={item.classExamId} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="min-w-0 break-words">{item.className}</span><ClassExamStatusBadge status={item.status} subtle />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-base-300)] pt-4">
                    <button type="button" className={examPrimary} disabled={isProcessing} onClick={() => handleCardCta(selectedExam.id, selectedExam.status, selectedExam.classAttachments.length > 0)}>
                      {selectedExam.status === "draft" ? "Continue building" : selectedExam.classAttachments.length ? "Manage classes" : "Add to a class"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    {selectedExam.status === "saved" && <button type="button" className={examSecondary} disabled={isProcessing} onClick={() => {
                      setCurrentExamId(selectedExam.id);
                      setOpenedFromEditExam(selectedExam.classAttachments.some((item) => item.status === "active"));
                      navigateTo("examBuilder");
                    }}>Edit exam</button>}
                    {selectedExam.classAttachments.length === 0 && (
                      <button type="button" className={`${examSecondary} text-red-700 hover:bg-red-50`} disabled={isProcessing} onClick={() => requestDelete(selectedExam.id)}>
                        <Trash2 size={15} aria-hidden="true" /> Delete exam
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateExam}
        isSubmitting={isCreating}
        error={createError}
        fixedSubject={selectedSubject?.isAssigned ? selectedSubject : null}
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
        onReopen={(classExamId) => {
          if (manageClassesExam) setReopenTarget({ classExamId, examCode: manageClassesExam.code });
        }}
        onRemove={handleRemoveAttachment}
        onEditSettings={(classExamId) => setSettingsClassExamId(classExamId)}
        onNavigate={handleNavigateFromClassExam}
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
        isOpen={publishedCodes !== null}
        examCode={publishedCodes?.examCode ?? ""}
        sessionCode={publishedCodes?.sessionCode ?? ""}
        reopenedUntil={publishedCodes?.reopenedUntil}
        onClose={() => setPublishedCodes(null)}
      />

      {reopenTarget && (
        <ReopenClassExamModal
          key={reopenTarget.classExamId}
          classExamId={reopenTarget.classExamId}
          onClose={() => setReopenTarget(null)}
          onReopened={({ endsAt, sessionCode }) => {
            setPublishedCodes({ examCode: reopenTarget.examCode, sessionCode, reopenedUntil: endsAt });
            setReopenTarget(null);
            refetch();
          }}
        />
      )}

      <SetSessionCodeModal
        isOpen={activateTarget !== null}
        isProcessing={isProcessing}
        error={actionError}
        onCancel={() => setActivateTarget(null)}
        onConfirm={confirmActivateWithCode}
      />

      {/* Rendered last so it always sits on top of the other modals (e.g. "End Exam" inside Manage Classes) */}
      <ExamConfirmDialog
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
    </div>
  );
}
