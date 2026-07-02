// Props contract for the shared teacher web sidebar.

export type TeacherScreenName = "dashboard" | "examLibrary" | "examBuilder";

export interface TeacherSidebarProps {
  activeItem?: TeacherScreenName;
}