import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar"; 
import { useRouterLogic } from "../../router/routerLogic"; 
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore";

const buttonClass =
  "px-3 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 border-[var(--color-base-300)] bg-[var(--color-base-100)] text-[var(--color-base-content)]"; 

const violationsButtonClass =
  "px-3 py-2 rounded-lg border text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-80 border-transparent bg-[var(--color-error)] text-white"; 

export function StudentMonitoringScreen() {
  const navigateTo = useRouterLogic((state) => state.navigateTo); 
  const classExamId = useViolationMonitoringStore((state) => state.currentClassExamId);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      {/* full-screen shell */}
      <TeacherSidebar activeItem="examLibrary" /> {/* keeps Exam Library highlighted */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader /> {/* top bar with the user's name */}
        <main className="flex-1 overflow-y-auto px-8 py-6" style={{ color: "var(--color-base-content)" }}>
          <p className="text-xs opacity-60 mb-2">Teacher Portal &gt; Exam Library &gt; Student Monitoring</p> {/* breadcrumb */}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Student Monitoring</h1> {/* screen title */}
              <p className="text-sm opacity-70">Live view of the students in this class exam.</p> {/* placeholder, real header comes later */}
            </div>
            <div className="flex gap-2"> {/* Violations sits to the left of Refresh */}
              <button onClick={() => navigateTo("violationMonitoring")} className={violationsButtonClass}>
                Violations
              </button> {/* opens the existing screen */}
              <button onClick={() => { /* refetch wired in step 3 */ }} className={buttonClass}>
                Refresh
              </button> {/* does nothing yet */}
            </div>
          </div>
          <p className="text-sm opacity-60">Class exam: {classExamId ?? "none selected"}</p> {/* temporary, proves the id arrived */}
        </main>
      </div>
    </div>
  );
}