import { TeacherSelect } from "../shared/teacherSelect";

export function ExamSubjectFilter({ subjects, value, onChange }: {
  subjects: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return <TeacherSelect label="Filter by subject" className="w-full sm:w-60" value={value} onChange={onChange}
    options={[{ value: null, label: "All subjects" }, ...subjects.map((subject) => ({ value: subject.id, label: subject.name }))]} />;
}
