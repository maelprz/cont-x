import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ConfirmActionDialog } from "../../components/shared/confirmActionDialog"; // shared yes/no dialog, reused for the Remove confirmation
import { useViolationMonitoring } from "../../hooks/useViolationMonitoring";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore"; // reads which class exam is selected
import type { ViolationDetailRow } from "./violationMonitoringScreen.types";

// turns a raw violation_type value into a readable label
function getViolationTypeLabel(
  type: ViolationDetailRow["violationType"],
): string {
  switch (type) {
    case "alt_tab":
      return "Alt+Tab"; // switched away using alt tab
    case "windows":
      return "Windows Key"; // pressed the windows key
    case "screenshot":
      return "Screenshot"; // took a screenshot
    case "copy_paste":
      return "Copy / Paste"; // used copy, cut, or paste
  }
}

// turns a raw session status into a readable label
function getStatusLabel(
  status: "in_progress" | "submitted" | "timed_out" | "removed",
): string {
  switch (status) {
    case "in_progress":
      return "In Progress"; // student is still taking the exam
    case "submitted":
      return "Submitted"; // student submitted their answers
    case "timed_out":
      return "Timed Out"; // the exam timer ran out
    case "removed":
      return "Removed"; // the teacher removed the student mid-exam
  }
}

// the overlay listing full violation detail for one clicked session
function ViolationDetailModal({
  isOpen,
  isLoading,
  error,
  violations,
  onClose,
}: {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  violations: ViolationDetailRow[];
  onClose: () => void;
}) {
  if (!isOpen) return null; // render nothing when no session is selected

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }} // dims the background behind the modal
      onClick={onClose} // click outside the card closes the modal
    >
      <div
        className="rounded-2xl border w-[520px] max-h-[70vh] overflow-y-auto p-6 bg-[var(--color-base-100)] border-[var(--color-base-300)]"
        onClick={(event) => event.stopPropagation()} // stops the outside click from firing
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-[var(--color-base-content)]">
            Violation Details
          </h2>
          <button
            onClick={onClose}
            className="text-[13px] font-medium cursor-pointer border-none bg-transparent text-[var(--color-base-content)] opacity-60 hover:opacity-100"
          >
            Close
          </button>
        </div>

        {isLoading && (
          <p className="text-[13px] text-[var(--color-base-content)] opacity-60">
            Loading violations...
          </p>
        )}

        {error && (
          <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!isLoading && !error && violations.length === 0 && (
          <p className="text-[13px] text-[var(--color-base-content)] opacity-60">
            No violations were logged for this session.
          </p>
        )}

        {!isLoading && !error && violations.length > 0 && (
          <table className="w-full text-[13px] text-[var(--color-base-content)]">
            <thead>
              <tr className="text-left opacity-60">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Details</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation) => (
                <tr
                  key={violation.id}
                  className="border-t border-[var(--color-base-300)]"
                >
                  <td className="py-2 pr-3">
                    {getViolationTypeLabel(violation.violationType)}
                  </td>
                  <td className="py-2 pr-3 opacity-80">
                    {violation.details ?? "—"}
                  </td>
                  <td className="py-2 opacity-80">{violation.loggedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ViolationMonitoringScreen() {
  const classExamId = useViolationMonitoringStore(
    (state) => state.currentClassExamId,
  );
  const {
    sessions,
    header,
    isLoading,
    error,
    refetch,
    selectedSessionId,
    violations,
    isViolationsLoading,
    violationsError,
    openViolationModal,
    closeViolationModal,
    sessionToRemove, // the row waiting for the teacher's confirmation
    isRemoving, // true while the remove call is running
    removeError, // failure reason shown inside the confirm dialog
    requestRemove, // opens the confirm dialog for one row
    cancelRemove, // closes the dialog without removing anyone
    confirmRemove, // runs the removal
  } = useViolationMonitoring(classExamId);

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
            Teacher Portal &gt; Exam Library &gt; Violation Monitoring
          </p>

          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Violation Monitoring</h1>
              <p className="text-sm opacity-70 max-w-md leading-relaxed">
                {header
                  ? `Reviewing attempts for "${header.examTitle}" in ${header.className}.` // exam and class this screen is scoped to
                  : "Reviewing attempts for this class exam."}
              </p>
            </div>

            <button
              onClick={refetch}
              className="px-3 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 border-[var(--color-base-300)] bg-[var(--color-base-100)] text-[var(--color-base-content)]"
            >
              Refresh
            </button>
          </div>

          {error && (
            <p
              className="text-[13px] mb-4"
              style={{ color: "var(--color-error)" }}
            >
              {error}
            </p>
          )}

          <div className="rounded-2xl border overflow-hidden bg-[var(--color-base-100)] border-[var(--color-base-300)]">
            <table className="w-full text-[13px] text-[var(--color-base-content)]">
              <thead>
                <tr className="text-left border-b border-[var(--color-base-300)] opacity-60">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">ID Number</th>
                  <th className="px-5 py-3 font-medium">Attempt</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classExamId === null && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-6 text-center opacity-60"
                    >
                      No class exam selected. Open this screen from an exam
                      card.
                    </td>
                  </tr>
                )}

                {classExamId !== null && isLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-6 text-center opacity-60"
                    >
                      Loading sessions...
                    </td>
                  </tr>
                )}

                {classExamId !== null &&
                  !isLoading &&
                  sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-6 text-center opacity-60"
                      >
                        No attempts have been recorded for this class yet.
                      </td>
                    </tr>
                  )}

                {classExamId !== null &&
                  !isLoading &&
                  sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-t border-[var(--color-base-300)]"
                    >
                      <td className="px-5 py-3">{session.studentName}</td>
                      <td className="px-5 py-3 opacity-80">
                        {session.studentIdNumber}
                      </td>
                      <td className="px-5 py-3 opacity-80">
                        {session.attemptNumber}
                      </td>
                      <td className="px-5 py-3 opacity-80">
                        {getStatusLabel(session.status)}
                      </td>
                      <td className="px-5 py-3 opacity-80">
                        {session.joinedAt}
                      </td>
                      <td className="px-5 py-3 opacity-80">
                        {session.submittedAt ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openViolationModal(session.id)}
                          className="font-bold cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70 text-[var(--color-secondary)]"
                        >
                          {session.violationCount}
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        {session.status === "in_progress" && ( // only a running attempt can be removed
                          <button
                            onClick={() => requestRemove(session)} // opens the confirm dialog for this row
                            className="text-[13px] font-semibold cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70 text-[var(--color-error)]"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <ViolationDetailModal
        isOpen={selectedSessionId !== null}
        isLoading={isViolationsLoading}
        error={violationsError}
        violations={violations}
        onClose={closeViolationModal}
      />

      <ConfirmActionDialog
        isOpen={sessionToRemove !== null} // open whenever a row is waiting for confirmation
        title="Remove student?" // short question
        message={`${sessionToRemove?.studentName ?? "This student"} will be removed from this exam. Their saved answers are kept, this attempt is used up, and they will be sent back to their dashboard shortly.`} // says exactly what happens
        confirmLabel="Remove" // red confirm button text
        isProcessing={isRemoving} // disables the button while the call runs
        error={removeError} // shows a failure reason inside the dialog
        onConfirm={confirmRemove} // runs the removal
        onCancel={cancelRemove} // closes without doing anything
      />
    </div>
  );
}
