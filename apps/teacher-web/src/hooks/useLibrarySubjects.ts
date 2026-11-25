import { useEffect, useMemo, useState } from "react";
import { getAssignedSubjects, getClassCountsBySubject } from "../services/subjectService";
import type { AssignedSubject } from "../services/subjectService";
import type { ExamCard, SubjectCard } from "../screens/examLibrary/examLibraryScreen.types";
import { useAuthStore } from "../store/useAuthStore";

// Builds the subject tiles for the top level of the Exam Library: every
// subject the teacher is assigned to (even ones with no exams yet, since
// that's where they'd create the first one), with exam/class/live counts
// derived from the exams already loaded — so counts stay correct after
// publish/end/delete without a second fetch.
export function useLibrarySubjects(exams: ExamCard[]) {
  const teacherId = useAuthStore((state) => state.user?.id);

  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    teacherId: string | undefined; revision: number; assigned: AssignedSubject[];
    classCounts: Record<string, number>; error: string | null; loaded: boolean;
  }>({ teacherId: undefined, revision: -1, assigned: [], classCounts: {}, error: null, loaded: false });
  const isCurrentTeacher = result.teacherId === teacherId;
  const isLoading = !!teacherId && (!isCurrentTeacher || result.revision !== revision);
  const error = !isLoading && isCurrentTeacher ? result.error : null;
  const assigned = useMemo(() => isCurrentTeacher ? result.assigned : [], [isCurrentTeacher, result.assigned]);
  const classCounts = useMemo(() => isCurrentTeacher ? result.classCounts : {}, [isCurrentTeacher, result.classCounts]);
  const assignmentsKnown = isCurrentTeacher && result.loaded;

  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;

    Promise.all([getAssignedSubjects(teacherId), getClassCountsBySubject(teacherId)])
      .then(([subjects, counts]) => {
        if (!isActive) return;
        setResult({ teacherId, revision, assigned: subjects, classCounts: counts, error: null, loaded: true });
      })
      .catch(() => {
        if (isActive) setResult((previous) => ({
          teacherId, revision,
          assigned: previous.teacherId === teacherId ? previous.assigned : [],
          classCounts: previous.teacherId === teacherId ? previous.classCounts : {},
          loaded: previous.teacherId === teacherId && previous.loaded,
          error: "Could not load your subjects. Try again.",
        }));
      });

    return () => {
      isActive = false;
    };
  }, [teacherId, revision]);

  const subjects = useMemo<SubjectCard[]>(() => {
    const byId = new Map<string, SubjectCard>();

    assigned.forEach((subject) => {
      byId.set(subject.id, {
        id: subject.id,
        name: subject.name,
        examCount: 0,
        classCount: classCounts[subject.id] ?? 0,
        liveClassCount: 0,
        isAssigned: true,
      });
    });

    exams.forEach((exam) => {
      let card = byId.get(exam.subjectId);
      if (!card) {
        // exam under a subject the teacher is no longer assigned to
        card = {
          id: exam.subjectId,
          name: assignmentsKnown ? "Unassigned subject" : "Subject unavailable",
          examCount: 0,
          classCount: 0,
          liveClassCount: 0,
          isAssigned: false,
        };
        byId.set(exam.subjectId, card);
      }
      card.examCount += 1;
      card.liveClassCount += exam.classAttachments.filter((a) => a.status === "active").length;
    });

    return [...byId.values()].sort((a, b) => {
      if (a.isAssigned !== b.isAssigned) return a.isAssigned ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [assigned, classCounts, exams, assignmentsKnown]);

  return { subjects, isLoading, error, refetch: () => setRevision((value) => value + 1) };
}
