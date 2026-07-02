import type { TeacherHeaderProps } from "./teacherHeader.types";
import {useAuthStore} from "../../store/useAuthStore";

// Single shared header bar for all teacher web screens.
export function TeacherHeader({}: TeacherHeaderProps) {
  const user = useAuthStore((state) => state.user);

  const userName = user?.fullName ?? "";
  const userID = user?.idNumber ?? "";

  return (
    <header
      className="h-14 flex items-center px-8 shrink-0 border-b"
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: "var(--color-base-300)",
      }}
    >
      <div className="flex justify-between items-center w-full">

        {/* left side: intentionally empty */}
        <div />

        {/* right side: teacher identity */}
        <div className="flex flex-col items-end">
          <p
            className="text-[13px] font-semibold leading-none"
            style={{ color: "var(--color-base-content)" }}
          >
            {userName}
          </p>
          <p
            className="font-mono text-[10px] mt-0.5"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            {userID}
          </p>
        </div>

      </div>
    </header>
  );
}