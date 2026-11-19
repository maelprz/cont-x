// Props contract for the shared teacher web sidebar.

export type TeacherScreenName =
  | "myClasses"
  | "dashboard" 
  | "examLibrary" 
  | "examBuilder" 
  | "questionBank" 
  | "examResultsList" 
  | "examResults"
  | "userManagement" 
  | "auditLogs"
  | "subjectsClasses";

export interface TeacherSidebarProps {
  activeItem?: TeacherScreenName;
}
