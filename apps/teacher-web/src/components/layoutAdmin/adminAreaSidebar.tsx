import { AdminSidebar } from "./adminSidebar"; // the sidebar for the top-level account
import type { AdminSidebarProps } from "./adminSidebar.types"; // same props the admin sidebar already takes
import { TeacherSidebar } from "../layout/teacherSidebar"; // the sidebar for teachers
import { useAuthStore } from "../../store/useAuthStore"; // gives us the logged-in user

// picks the right sidebar for the admin screens based on who is looking at them
export function AdminAreaSidebar({ activeItem }: AdminSidebarProps) { // used by User Management and Audit Logs
  const user = useAuthStore((state) => state.user); // the logged-in user
  if (user?.role === "teacher") return <TeacherSidebar activeItem={activeItem} />; // a teacher-admin keeps the teacher layout
  return <AdminSidebar activeItem={activeItem} />; // the top-level account keeps the admin layout
}