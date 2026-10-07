import { useEffect, useState } from "react"; // tracks fetch state on mount
import { getExamsByTeacherId } from "../services/examService"; // existing query, already has everything needed
import type { ExamCard } from "../screens/examLibrary/examLibraryScreen.types"; // shape of one exam row

// What the Dashboard screen needs, derived from the teacher's exam list.
export interface TeacherDashboardData {
  totalExams: number; // count of all exams, any status
  totalStudents: number; // sum of student sessions across all exams — see caveat below
  recentExams: ExamCard[]; // exams sorted newest first, for the table
}

// Fetches all exams for a teacher and derives dashboard summary numbers from them.
export function useTeacherDashboard(teacherId: string | undefined) {
  const [data, setData] = useState<TeacherDashboardData | null>(null); // holds the derived dashboard data
  const [isLoading, setIsLoading] = useState(true); // true while the fetch is in flight
  const [error, setError] = useState<string | null>(null); // holds a message if the fetch fails

  useEffect(() => {
    // No logged-in teacher yet — nothing to fetch.
    if (!teacherId) {
      setIsLoading(false); // stop showing a loading state with nothing to load
      return;
    }

    let isCancelled = false; // guards against setting state after unmount

    async function loadDashboard() {
      setIsLoading(true); // show loading while we fetch
      setError(null); // clear any previous error

      try {
        const exams = await getExamsByTeacherId(teacherId!); // reuse the existing query as-is

        if (!isCancelled) {
          const totalStudents = exams.reduce(
            (sum, exam) =>
              sum + exam.classAttachments.reduce((a, attachment) => a + attachment.studentCount, 0),
            0,
          );

          setData({
            totalExams: exams.length, // count of every exam, regardless of status
            totalStudents, // summed session count — see the module doc comment above
            recentExams: exams, // already sorted newest-first by the service
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setError("Could not load dashboard data."); // network/DB failure
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false); // loading is done either way
        }
      }
    }

    loadDashboard();

    return () => {
      isCancelled = true; // cleanup if the component unmounts mid-fetch
    };
  }, [teacherId]); // re-run if the logged-in teacher changes

  return { data, isLoading, error }; // expose state to the screen
}