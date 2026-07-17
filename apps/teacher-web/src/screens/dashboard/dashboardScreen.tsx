import type {
  DashboardScreenProps,
  ExamSummaryCard,
} from "./dashboardScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useRouterLogic } from "../../router/routerLogic";
import { useAuthStore } from "../../store/useAuthStore";
import { useTeacherDashboard } from "../../hooks/useTeacherDashboard";
import { getExamCardNavigation } from "../../router/examCardNavigation";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import type { ExamCard } from "../examLibrary/examLibraryScreen.types";

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// one summary stat card, same role as DetailCard in examConfirmationScreen
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
  const setCurrentExamId = useExamBuilderStore((state) => state.setCurrentExamId);

  // navigates to wherever this exam's current status says it should go
  const openExamByStatus = (examId: string, status: ExamCard["status"]) => {
    const { targetScreen } = getExamCardNavigation(status);
    setCurrentExamId(examId);
    navigateTo(targetScreen);
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
                  const { ctaLabel } = getExamCardNavigation(exam.status); // status-driven label for this row

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
                        <span
                          className="text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              exam.status === "active"
                                ? "var(--color-success)"
                                : exam.status === "draft"
                                  ? "var(--color-base-300)"
                                  : "var(--color-warning)",
                            color:
                              exam.status === "active"
                                ? "var(--color-success-content)"
                                : exam.status === "draft"
                                  ? "var(--color-base-content)"
                                  : "var(--color-warning-content)",
                          }}
                        >
                          {exam.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {exam.studentCount ?? 0}
                      </td>
                      <td className="py-3.5 px-5 text-sm opacity-70">
                        {exam.createdAt}
                      </td>
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => openExamByStatus(exam.id, exam.status)}
                          className="text-xs px-3 py-1 rounded-lg border cursor-pointer hover:opacity-80"
                          style={{
                            borderColor: "var(--color-base-300)",
                            color: "var(--color-base-content)",
                            backgroundColor: "transparent",
                          }}
                        >
                          {ctaLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs opacity-50 mt-3">Showing 3 of 3 exams</p>
        </main>
      </div>
    </div>
  );
}
