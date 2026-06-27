import { useState } from "react";
import type { ChangeEvent } from "react";
import type { DashboardScreenProps } from "./dashboardScreen.types";
import "./dashboardScreen.css";
import { useRouterLogic } from "../../router/routerLogic";
import { Terminal, ArrowRight } from "lucide-react";

export function DashboardScreen(_props: DashboardScreenProps) {
  const [examCodeInput, setExamCodeInput] = useState("");
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  //Handlers - what happens when the user interacts with the UI
  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    //
    setExamCodeInput(event.target.value);
  }

  function handleVerifyExamCode() {
    navigateTo("examConfirmation");
  }

  return (
    <div className="dashboard-screen">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <span className="dashboard-status-badge">
          {" "}
          Candidate Verification Active
        </span>
      </header>

      <main className="dashboard-content">
        <section className="initialize-session-card">
          <div className="initialize-session-text">
            <h2>Enter Exam Code</h2>
            <p>
              Ready to begin your assessment? Enter the exam code your
              instructor gave you to verify and continue.
            </p>
          </div>

          <div className="initialize-session-action">
            <input
              type="text"
              placeholder="Enter exam code"
              value={examCodeInput}
              onChange={handleExamCodeChange}
            />

            <button type="button" onClick={handleVerifyExamCode}>
              Verify Exam Code <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="empty-exams-state">
          <div className="empty-exams-icon-circle">
            <Terminal size={28} />{" "}
            {/* terminal icon, matching the reference image */}
          </div>
          <h3 className="empty-exams-title">No Previous Exams Found</h3>
          <p className="empty-exams-description">
            Once you complete an exam, your results will appear here.
          </p>
        </section>
      </main>
    </div>
  );
}
