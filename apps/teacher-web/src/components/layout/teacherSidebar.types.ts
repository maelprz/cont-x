// Props contract for the shared teacher web sidebar.

export type TeacherScreenName = "dashboard" | "examLibrary";

export interface TeacherSidebarProps {
  activeItem?: TeacherScreenName;
}