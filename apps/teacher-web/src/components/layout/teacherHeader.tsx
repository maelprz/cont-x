import type { TeacherHeaderProps } from "./teacherHeader.types";

// Single shared header bar for all teacher web screens.
export function TeacherHeader({
  teacherName = "Teacher",
  teacherId = "T-00000",
}: TeacherHeaderProps) {
  return (
    <header
      className="h-14 flex items-center px-8 shrink-0"
      style={{ backgroundColor: "var(--color-neutral)" }}
    >
      <div className="flex justify-between items-center w-full">
        <span
          className="text-lg font-bold tracking-[4px]"
          style={{ color: "var(--color-neutral-content)" }}
        >
          Cont/x
        </span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-neutral-content)"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: "var(--color-neutral-content)" }}
            >
              Secure Terminal Session
            </span>
          </div>

          <div
            className="w-px h-5"
            style={{ backgroundColor: "rgba(248,248,248,0.2)" }}
          />

          <div className="flex flex-col items-end">
            <p
              className="text-[13px] font-semibold leading-none"
              style={{ color: "var(--color-neutral-content)" }}
            >
              {teacherName}
            </p>
            <p
              className="font-mono text-[10px] mt-0.5"
              style={{ color: "rgba(248,248,248,0.7)" }}
            >
              {teacherId}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}