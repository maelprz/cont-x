import { useState } from "react";
import type { ChangeEvent } from "react";
import type { DashboardScreenProps } from "./dashboardScreen.types";
import "./dashboardScreen.css";
import { Terminal } from "lucide-react";

export function DashboardScreen(_props: DashboardScreenProps) {
  const [examCodeInput, setExamCodeInput] = useState("");
  const [isExamCodeModalOpen, setIsExamCodeModalOpen] = useState(false);

  //Handlers - what happens when the user interacts with the UI
  function handleExamCodeChange(event: ChangeEvent<HTMLInputElement>) {
    //
    setExamCodeInput(event.target.value);
  }

  function handleVerifyExamCode() {
    setIsExamCodeModalOpen(true);
  }

  return (
    <div className="dashboard-screen">
      <h1>Welcome to the Dashboard</h1>
      <span>No Active Session</span>
      <div className="initialize-session-card">
        <h2>Enter Exam Code</h2>
        <input
          type="text"
          placeholder="Enter exam code"
          value={examCodeInput}
          onChange={handleExamCodeChange}
        />
        <button type="button" onClick={handleVerifyExamCode}>
          Verify Exam Code
        </button>
      </div>
      //No previous exam found
      <div className="prev-exam-card">
        <h3>Previous Exam</h3>
        <p>No previous exam found</p>
      </div>
    </div>
  );
}
