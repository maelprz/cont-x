import { useCallback, useEffect, useState } from "react";
import {
  createClass,
  createSubject,
  fetchSubjects,
  fetchTeachers,
  searchStudents,
  enrollStudent,
  enrollStudentsCsv,
  archiveClass,
  type SubjectSummary, // the subject shape
  type TeacherOption, // the teacher shape
  type CsvEnrollResult, // the CSV result shape
} from "../services/subjectsClassesService"; // all database calls for this feature live there

export function useSubjectsClasses() {
  // the screen calls this hook and never the service directly
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (showSpinner = true) => {
    // fetches everything again
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([fetchSubjects(), fetchTeachers()]);
      setSubjects(s);
      setTeachers(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subjects."); // keep a safe message
    } finally {
      setIsLoading(false); // loading is over either way
    }
  }, []); // the function never changes

  useEffect(() => {
    reload();
  }, [reload]);

  const addSubject = useCallback(
    async (name: string) => {
      // creates a subject, then refreshes the list
      const created = await createSubject(name); // throws a safe message if the database refuses
      await reload(false); // quiet refresh, so the cards do not flicker
      return created; // let the caller know what was created
    },
    [reload],
  ); // depends only on reload

  const addClass = useCallback(
    async (subjectId: string, name: string, teacherId: string) => {
      // creates a class, then refreshes the list
      const created = await createClass(subjectId, name, teacherId); // throws a safe message if the database refuses
      await reload(false); // quiet refresh, so the open modal updates in place
      return created; // the screen shows the new class code
    },
    [reload],
  ); // depends only on reload

  const archiveClassById = useCallback(async (classId: string) => { // archives a class, then refreshes the list
    await archiveClass(classId); // throws a safe message if the database refuses
    await reload(false); // quiet refresh, so the open modal updates in place
  }, [reload]); // depends only on reload

  const findStudents = useCallback((term: string) => searchStudents(term), []); // passes the typed text through the service

  const enrollInClass = useCallback(
    async (classId: string, studentId: string) => {
      await enrollStudent(classId, studentId); // throws a safe message if the database refuses
    },
    [],
  ); // depends only on the service
  const enrollCsvInClass = useCallback(
    async (classId: string, idNumbers: string[]): Promise<CsvEnrollResult> => {
      return enrollStudentsCsv(classId, idNumbers); // throws a safe message on a whole-upload failure
    },
    [],
  );

  return {
    subjects,
    teachers,
    isLoading,
    error,
    reload,
    addSubject,
    addClass,
    findStudents,
    enrollInClass,
    enrollCsvInClass,
    archiveClassById,
  };
}
