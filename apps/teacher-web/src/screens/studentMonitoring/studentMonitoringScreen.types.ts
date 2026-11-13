// What the teacher sees for one student's state in the monitoring table.
// "not_joined" and "offline" are worked out by the app, they are not stored statuses:
//   not_joined = enrolled in the class but no attempt exists yet
//   offline    = attempt is in progress but the student's app has not reported for too long
// The other four match the status values in exam_sessions.
export type MonitoringStatus =
  | "not_joined"
  | "in_progress" 
  | "offline" 
  | "submitted" 
  | "timed_out" 
  | "removed"; 

// One row of the monitoring table, already shaped for display.
export interface StudentMonitoringRow {
  studentId: string; 
  sessionId: string | null; 
  studentName: string; 
  studentIdNumber: string; 
  attemptNumber: number | null; 
  status: MonitoringStatus; 
  currentPosition: number | null; 
  totalQuestions: number | null; 
  answeredCount: number | null; 
  isFocused: boolean | null;
  secondsSinceSeen: number | null; 
  violationCount: number; 
}