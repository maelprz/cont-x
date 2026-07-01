// Props contract for the shared teacher web sidebar.

export type TeacherScreenName = "dashboard" | "examBuilder" | "exams";

export interface TeacherSidebarProps {
  activeItem?: TeacherScreenName;
}