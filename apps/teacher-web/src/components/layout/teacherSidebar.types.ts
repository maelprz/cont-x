// Props contract for the shared teacher web sidebar.

export type TeacherScreenName =
  | "dashboard" 
  | "examLibrary" 
  | "examBuilder" 
  | "questionBank" 
  | "examResultsList" 
  | "examResults"
  | "userManagement" 
  | "auditLogs"; 

export interface TeacherSidebarProps {
  activeItem?: TeacherScreenName;
}
