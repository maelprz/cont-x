import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import { examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { Pagination } from "../../components/shared/pagination";
import { EnrollStudentModal } from "../../components/subjectsClasses/enrollStudentModal";
import { usePagination } from "../../hooks/usePagination";
import { useToast } from "../../hooks/useToast";
import {
  enrollTeacherClassStudent,
  getTeacherClasses,
  getTeacherClassRoster,
  searchTeacherEnrollmentStudents,
  type TeacherClass,
} from "../../services/myClassesService";
import type { StudentOption } from "../../services/subjectsClassesService";
import { useAuthStore } from "../../store/useAuthStore";

const panel = "overflow-hidden rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)]";
const row = "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-base-300)] px-4 py-3 last:border-b-0";

type LoadResult<T> = { data: T; error?: never } | { error: string; data?: never };

function ClassRoster({ classInfo, onBack }: { classInfo: TeacherClass; onBack: () => void }) {
  const [result, setResult] = useState<LoadResult<StudentOption[]> | null>(null);
  const [revision, setRevision] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const { showToast } = useToast();
  const classId = classInfo.id;
  const roster = usePagination(result?.data ?? []);

  useEffect(() => {
    let cancelled = false;
    getTeacherClassRoster(classId).then(
      (data) => { if (!cancelled) setResult({ data }); },
      (error: Error) => { if (!cancelled) setResult({ error: error.message }); },
    );
    return () => { cancelled = true; };
  }, [classId, revision]);

  const searchStudents = useCallback(
    (term: string) => searchTeacherEnrollmentStudents(classId, term),
    [classId],
  );

  function reloadRoster() {
    setResult(null);
    setRevision((current) => current + 1);
  }

  async function enroll(student: StudentOption) {
    setIsSaving(true);
    setEnrollError(null);
    try {
      await enrollTeacherClassStudent(classId, student.id);
      setIsOpen(false);
      reloadRoster();
      showToast(`${student.fullName} enrolled in ${classInfo.name}.`);
    } catch (error) {
      setEnrollError(error instanceof Error ? error.message : "Could not enroll the student.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div>
        <button type="button" className={examSecondary} onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to My Classes
        </button>
        <h2 className="mt-4 text-lg font-semibold wrap-anywhere">{classInfo.name}</h2>
        <p className="mt-0.5 text-sm text-stone-600 wrap-anywhere">
          {[classInfo.subjectName, classInfo.code, classInfo.archived ? "Archived" : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <section className={panel} aria-labelledby="my-class-roster-heading">
        <div className={row}>
          <div>
            <h3 id="my-class-roster-heading" className="text-sm font-semibold">Class roster</h3>
            {result?.data && <p className="text-xs text-stone-600">{result.data.length} enrolled</p>}
          </div>
          {!classInfo.archived && (
            <button type="button" className={examPrimary} onClick={() => {
              setEnrollError(null);
              setIsOpen(true);
            }}>
              <UserPlus size={15} aria-hidden="true" /> Enroll student
            </button>
          )}
        </div>
        {!result && <p role="status" className="px-4 py-3 text-sm">Loading students…</p>}
        {result?.error && (
          <div className={row}>
            <p role="alert" className="text-sm text-red-700">{result.error}</p>
            <button type="button" className={examSecondary} onClick={reloadRoster}>Retry</button>
          </div>
        )}
        {result?.data && result.data.length === 0 && (
          <p className="px-4 py-3 text-sm">No students are enrolled in this class yet.</p>
        )}
        {roster.items.length > 0 && (
          <ul aria-label="Enrolled students">
            {roster.items.map((student) => (
              <li key={student.id} className={row}>
                <span className="text-sm font-medium wrap-anywhere">{student.fullName}</span>
                <span className="text-xs text-stone-600 tabular-nums">{student.idNumber}</span>
              </li>
            ))}
          </ul>
        )}
        {roster.pageCount > 1 && <Pagination label="Class roster pages" {...roster} />}
      </section>
      <EnrollStudentModal
        isOpen={isOpen}
        classTitle={classInfo.name}
        classCode={classInfo.code}
        isSaving={isSaving}
        error={enrollError}
        onClose={() => setIsOpen(false)}
        onSearch={searchStudents}
        onSubmit={(student) => void enroll(student)}
      />
    </>
  );
}

function MyClassesContent({ teacherId }: { teacherId: string }) {
  const [result, setResult] = useState<LoadResult<TeacherClass[]> | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const classes = usePagination(result?.data ?? []);

  useEffect(() => {
    let cancelled = false;
    getTeacherClasses(teacherId).then(
      (data) => { if (!cancelled) setResult({ data }); },
      (error: Error) => { if (!cancelled) setResult({ error: error.message }); },
    );
    return () => { cancelled = true; };
  }, [teacherId, revision]);

  if (selectedClass) {
    return <ClassRoster key={selectedClass.id} classInfo={selectedClass} onBack={() => setSelectedClass(null)} />;
  }

  return (
    <section className={panel} aria-label="Assigned classes">
      {!result && <p role="status" className="px-4 py-3 text-sm">Loading classes…</p>}
      {result?.error && (
        <div className={row}>
          <p role="alert" className="text-sm text-red-700">{result.error}</p>
          <button type="button" className={examSecondary} onClick={() => {
            setResult(null);
            setRevision((current) => current + 1);
          }}>Retry</button>
        </div>
      )}
      {result?.data && result.data.length === 0 && (
        <p className="px-4 py-3 text-sm">You have no assigned classes yet.</p>
      )}
      {classes.items.length > 0 && (
        <ul>
          {classes.items.map((classInfo) => (
            <li key={classInfo.id} className={row}>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold wrap-anywhere">{classInfo.name}</h2>
                <p className="text-xs text-stone-600 wrap-anywhere">
                  {[classInfo.subjectName, classInfo.code, classInfo.archived ? "Archived" : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className={examSecondary}
                aria-label={`View roster for ${classInfo.name} (${classInfo.code})`}
                onClick={() => setSelectedClass(classInfo)}>
                View roster
              </button>
            </li>
          ))}
        </ul>
      )}
      {classes.pageCount > 1 && <Pagination label="My Classes pages" {...classes} />}
    </section>
  );
}

export function MyClassesScreen() {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== "teacher") return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="myClasses" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="My Classes" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-6">
            <MyClassesContent key={user.id} teacherId={user.id} />
          </div>
        </main>
      </div>
    </div>
  );
}
