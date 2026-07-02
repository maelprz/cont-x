import { Plus } from "lucide-react";

export function CreateNewCard({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors duration-200 min-h-[260px] w-full bg-transparent"
      style={{ borderColor: "var(--color-base-300)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-base-100)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-base-300)]">
        <Plus size={22} style={{ color: "var(--color-base-content)", opacity: 0.6 }} />
      </div>
      <div className="text-center">
        <p className="text-[16px] font-bold mb-1 text-[var(--color-base-content)]">
          Create New Assessment
        </p>
        <p className="text-[13px] text-[var(--color-base-content)] opacity-55">
          Start building a new examination for your students.
        </p>
      </div>
    </button>
  );
}