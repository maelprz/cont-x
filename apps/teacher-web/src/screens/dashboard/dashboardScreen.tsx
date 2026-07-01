import { Plus } from "lucide-react";
import type { DashboardScreenProps, ExamSummaryCard } from "./dashboardScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useRouterLogic } from "../../router/routerLogic";

// ---------------------------------------------------------------------------
// Mock data -- replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------
const MOCK_TEACHER_NAME = "DLKG";
const MOCK_TEACHER_ID = "T-00421";

const MOCK_SUMMARY_CARDS: ExamSummaryCard[] = [
  { label: "Active Exams", value: "3", subtext: "Currently running" },
  { label: "Total Students", value: "128", subtext: "Enrolled across all exams" },
  { label: "Pending Reviews", value: "12", subtext: "Awaiting manual check" },
  { label: "Violations Flagged", value: "5", subtext: "Requires attention" },
];

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

export function DashboardScreen({
  teacherName = MOCK_TEACHER_NAME,
  teacherId = MOCK_TEACHER_ID,
  summaryCards = MOCK_SUMMARY_CARDS,
}: DashboardScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      <TeacherSidebar activeItem="dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader teacherName={teacherName} teacherId={teacherId} />

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
                Welcome back, {teacherName.split(" ")[0]}
              </h1>
              <p className="text-sm opacity-70 max-w-xl">
                Manage your exams, monitor live sessions, and review student
                activity from one place.
              </p>
            </div>
            <button
              onClick={() => navigateTo("examBuilder")}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 shrink-0 border-none cursor-pointer"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-content)",
              }}
            >
              <Plus size={16} />
              New Exam
            </button>
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
                    opacity: 1,
                  }}
                >
                  <th className="text-left py-3 px-5 font-medium opacity-60">Exam Title</th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">Code</th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">Status</th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">Students</th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">Created</th>
                  <th className="text-left py-3 px-5 font-medium opacity-60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* placeholder rows -- replace with real exam data when wiring up */}
                {[
                  {
                    id: "1",
                    title: "Midterm Coding Exam",
                    code: "CS101-42",
                    status: "active",
                    students: 34,
                    created: "2026-06-28",
                  },
                  {
                    id: "2",
                    title: "Final Algorithm Assessment",
                    code: "CS302-17",
                    status: "draft",
                    students: 0,
                    created: "2026-06-25",
                  },
                  {
                    id: "3",
                    title: "Database Design Quiz",
                    code: "DB221-09",
                    status: "ended",
                    students: 28,
                    created: "2026-06-20",
                  },
                ].map((exam, index, arr) => (
                  <tr
                    key={exam.id}
                    className={`hover:opacity-80 ${
                      index < arr.length - 1
                        ? "border-b"
                        : ""
                    }`}
                    style={{
                      borderColor: "var(--color-base-300)",
                    }}
                  >
                    <td className="py-3.5 px-5 text-sm font-medium">{exam.title}</td>
                    <td className="py-3.5 px-5 text-sm font-mono opacity-70">{exam.code}</td>
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
                    <td className="py-3.5 px-5 text-sm opacity-70">{exam.students}</td>
                    <td className="py-3.5 px-5 text-sm opacity-70">{exam.created}</td>
                    <td className="py-3.5 px-5">
                      <button
                        className="text-xs px-3 py-1 rounded-lg border cursor-pointer hover:opacity-80"
                        style={{
                          borderColor: "var(--color-base-300)",
                          color: "var(--color-base-content)",
                          backgroundColor: "transparent",
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs opacity-50 mt-3">
            Showing 3 of 3 exams
          </p>
        </main>
      </div>
    </div>
  );
}