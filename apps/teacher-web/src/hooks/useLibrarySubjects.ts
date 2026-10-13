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

  const [assigned, setAssigned] = useState<AssignedSubject[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;
    setIsLoading(true);
    setError(null);

    Promise.all([getAssignedSubjects(teacherId), getClassCountsBySubject(teacherId)])
      .then(([subjects, counts]) => {
        if (!isActive) return;
        setAssigned(subjects);
        setClassCounts(counts);
      })
      .catch(() => {
        if (isActive) setError("Could not load your subjects. Try again.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [teacherId]);

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
          name: "Unassigned subject",
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
  }, [assigned, classCounts, exams]);

  return { subjects, isLoading, error };
}