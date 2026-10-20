// A subject on the top level of the Exam Library and the Question Bank. Both
// screens use the same tile; they only differ in the numbers underneath.
export function SubjectTile({
  name,
  note,
  badge,
  stats,
  onClick,
}: {
  name: string;
  note?: string; // small line under the name
  badge?: string; // e.g. "Live in 2 classes"
  stats: { label: string; value: number }[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-4 p-5 min-h-[150px] text-left rounded-2xl border cursor-pointer transition-shadow duration-200 hover:shadow-md bg-[var(--color-base-100)] border-[var(--color-base-300)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-bold leading-snug text-[var(--color-base-content)]">{name}</h3>
        {badge && (
          <span
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "var(--color-secondary)", color: "var(--color-secondary-content)" }}
          >
            {badge}
          </span>
        )}
      </div>

      {note && <p className="text-[12px] -mt-2 text-[var(--color-base-content)] opacity-55">{note}</p>}

      <div className="flex items-start gap-6 mt-auto">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5 text-[var(--color-base-content)] opacity-50">
              {stat.label}
            </p>
            <p className="text-[14px] font-bold text-[var(--color-base-content)]">{stat.value}</p>
          </div>
        ))}
      </div>
    </button>
  );
}