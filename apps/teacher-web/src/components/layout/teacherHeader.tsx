import type { TeacherHeaderProps } from "./teacherHeader.types";
import { useAuthStore } from "../../store/useAuthStore";

// Single shared header bar for all teacher web screens.
export function TeacherHeader({ title }: TeacherHeaderProps) {
  const user = useAuthStore((state) => state.user);

  const userName = user?.fullName ?? "";
  const userID = user?.idNumber ?? "";

  return (
    <header
      className={`flex shrink-0 items-center border-b ${title ? "min-h-14 px-4 py-2 sm:px-8" : "h-14 px-8"}`}
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: "var(--color-base-300)",
      }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        {title ? <h1 className="min-w-0 break-words text-base font-semibold sm:text-xl">{title}</h1> : <div />}

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
