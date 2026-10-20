import type {
  DashboardScreenProps,
  ExamSummaryCard,
} from "./dashboardScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useRouterLogic } from "../../router/routerLogic";
import { useAuthStore } from "../../store/useAuthStore";
import { useTeacherDashboard } from "../../hooks/useTeacherDashboard";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";
import {
  StatusBadge,
  ClassExamStatusBadge,
} from "../../components/examLibrary/statusBadge";

function SummaryCard({ label, value, subtext }: ExamSummaryCard) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: "var(--color-base-300)",
      }}
    >
      <p
        className="text-xs uppercase tracking-wide font-mono mb-2"
        style={{ color: "var(--color-base-content)", opacity: 0.6 }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-bold mb-1"
        style={{ color: "var(--color-base-content)" }}
      >
        {value}
      </p>
      <p
        className="text-xs"
        style={{ color: "var(--color-base-content)", opacity: 0.6 }}
      >
        {subtext}
      </p>
    </div>
  );
}

export function DashboardScreen({}: DashboardScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const setCurrentExamId = useExamBuilderStore(
    (state) => state.setCurrentExamId,
  );
  const setOpenedFromEditExam = useExamBuilderStore(
    (state) => state.setOpenedFromEditExam,
  );
  const setSelectedSubjectId = useExamLibraryStore(
    (state) => state.setSelectedSubjectId,
  );
  const openExam = (
    examId: string,
    status: "draft" | "saved",
    subjectId: string,
  ) => {
    if (status === "draft") {
      setCurrentExamId(examId);
      setOpenedFromEditExam(false); // still being authored, not a live-exam edit
      navigateTo("examBuilder");
    } else {
      setSelectedSubjectId(subjectId); // open the library straight inside this exam's subject
      navigateTo("examLibrary");
    }
  };

  // pulls the logged in user's name directly from the auth store
  const user = useAuthStore((state) => state.user);
  const firstName = user?.fullName?.split(" ")[0] ?? "Teacher";

  const { data, isLoading } = useTeacherDashboard(user?.id);

  const summaryCards: ExamSummaryCard[] = [
    {
      label: "Total Exams",
      value: isLoading ? "—" : String(data?.totalExams ?? 0), // count of all exams this teacher created
      subtext: "All statuses",
    },
    {
      label: "Total Students",
      value: isLoading ? "—" : String(data?.totalStudents ?? 0), // summed session count across all exams
      subtext: "Verified session starts",
    },
  ];

  const recentExams = data?.recentExams.slice(0, 5) ?? [];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      <TeacherSidebar activeItem="dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* no props needed, TeacherHeader reads from auth store itself */}
        <TeacherHeader />

        <main
          className="flex-1 overflow-y-auto px-8 py-6"
          style={{ color: "var(--color-base-content)" }}
        >
          <p className="text-xs opacity-60 mb-2">
            Teacher Portal &gt; Dashboard
          </p>

          {/* heading row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Welcome back, {firstName}
              </h1>
              <p className="text-sm opacity-70 max-w-xl">
                Manage your exams, monitor live sessions, and review student
                activity from one place.
              </p>
            </div>
          </div>

          {/* summary stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </div>

          {/* recent exams table shell -- data wired in later */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Exams</h2>
            <button
              onClick={() => navigateTo("examLibrary")}
              className="text-xs bg-transparent border-none cursor-pointer opacity-60 hover:opacity-100"
              style={{ color: "var(--color-base-content)" }}
            >
              View All
            </button>
          </div>

          <div
            className="rounded-2xl overflow-hidden border"
            style={{
              backgroundColor: "var(--color-base-100)",
              borderColor: "var(--color-base-300)",
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--color-base-200)",
                    color: "var(--color-base-content)",
                  }}
                >
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Exam Title
                  </th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Code
                  </th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Status
                  </th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Students
                  </th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Created
                  </th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam, index) => {
                  const studentCount = exam.classAttachments.reduce(
                    (sum, attachment) => sum + attachment.studentCount,
                    0,
                  );
                  const hasActiveAttachment = exam.classAttachments.some(
                    (attachment) => attachment.status === "active",
                  );

                  return (
                    <tr
                      key={exam.id}
                      className={`hover:opacity-80 ${
                        index < recentExams.length - 1 ? "border-b" : ""
                      }`}
                      style={{ borderColor: "var(--color-base-300)" }}
                    >
                      <td className="py-3.5 px-5 text-sm font-medium">
                        {exam.title}
                      </td>
                      <td className="py-3.5 px-5 text-sm font-mono opacity-70">
                        {exam.code}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={exam.status} />
                          {hasActiveAttachment && (
                            <ClassExamStatusBadge status="active" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {studentCount}
                      </td>
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {exam.createdAt}
                      </td>
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() =>
                            openExam(exam.id, exam.status, exam.subjectId)
                          }
                          className="text-xs px-3 py-1 rounded-lg border cursor-pointer hover:opacity-80"
                          style={{
                            borderColor: "var(--color-base-300)",
                            color: "var(--color-base-content)",
                            backgroundColor: "transparent",
                          }}
                        >
                          {exam.ctaLabel ?? "Open"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs opacity-50 mt-3">
            Showing {recentExams.length} of{" "}
            {isLoading ? "…" : (data?.totalExams ?? 0)} exams
          </p>
        </main>
      </div>
    </div>
  );
}
