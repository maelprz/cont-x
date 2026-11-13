// What the teacher sees for one student's state in the monitoring table.
// "not_joined" and "offline" are worked out by the app, they are not stored statuses:
//   not_joined = enrolled in the class but no session exists yet
//   offline    = session is in progress but the student's last "I'm here" update is too old
// The other four match the status values the violation screen already uses for exam_sessions.
export type MonitoringStatus =
  | "not_joined" // enrolled, never started the exam
  | "in_progress" // taking the exam and recently seen
  | "offline" // taking the exam but not heard from lately
  | "submitted" // finished and submitted
  | "timed_out" // the exam timer ran out
  | "removed"; // the teacher removed the student mid-exam

// One row of the monitoring table, already shaped for display.
export interface StudentMonitoringRow {
  studentId: string; // the student's user id
  sessionId: string | null; // null while the student has not joined
  studentName: string; // "Last, First" or however the screen formats it
  studentIdNumber: string; // the school ID number shown to the teacher
  status: MonitoringStatus; // see the comments above
  currentQuestionNumber: number | null; // position in THIS student's own order, null when not in an exam
  totalQuestions: number | null; // how many questions this student has, null when not joined
  answeredCount: number | null; // progress is answered out of total, null when not joined
  lastSeenAt: string | null; // formatted time of the last update from the student's app
  violationCount: number; // reuses the same count the violation screen shows
}

// The small header line: which exam and class this screen is scoped to.
export interface StudentMonitoringHeader {
  examTitle: string; // title of the exam
  className: string; // name of the class it was delivered to
}