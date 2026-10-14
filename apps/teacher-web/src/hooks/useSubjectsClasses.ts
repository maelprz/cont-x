import { useCallback, useEffect, useState } from "react"; 
import {
  createSubject,
  fetchSubjects, 
  fetchTeachers, 
  type SubjectSummary, // the subject shape
  type TeacherOption, // the teacher shape
} from "../services/subjectsClassesService"; // all database calls for this feature live there

export function useSubjectsClasses() { // the screen calls this hook and never the service directly
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]); 
  const [teachers, setTeachers] = useState<TeacherOption[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 

  const reload = useCallback(async () => { // fetches everything again
    setIsLoading(true); // show the loading state
    setError(null); // clear any old error
    try {
      const [s, t] = await Promise.all([fetchSubjects(), fetchTeachers()]); 
      setSubjects(s);
      setTeachers(t); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subjects."); 
    } finally {
      setIsLoading(false); 
    }
  }, []); 

  useEffect(() => { 
    reload(); 
  }, [reload]); 

  const addSubject = useCallback(async (name: string) => { // creates a subject, then refreshes the list
    const created = await createSubject(name); // throws a safe message if the database refuses
    await reload(); // show the new subject in the list
    return created; // let the caller know what was created
  }, [reload]); // depends only on reload

  return { subjects, teachers, isLoading, error, reload, addSubject }; // everything the screen needs
}