import type { BankVisibilityLevel } from "../../services/bankVisibilityService";

const LEVELS: { value: BankVisibilityLevel; label: string; hint: string }[] = [
  { value: "private", label: "Only me", hint: "Only you can access your bank questions" },
  { value: "course", label: "Course", hint: "Teachers assigned to this subject" },
  { value: "account", label: "Account", hint: "Teachers who share any of your subjects" },
  { value: "department", label: "Department", hint: "Teachers in your department or who share one of your subjects" },
];

// Segmented control for who can see a teacher's bank questions. With
// allowNone it also offers "No override" — used for the main question bank
// setting, where leaving it unset hands control back to each subject.
export function BankVisibilitySelector({
  value,
  onChange,
  disabled,
  allowNone,
  label,
}: {
  value: BankVisibilityLevel | null | undefined;
  onChange: (level: BankVisibilityLevel | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
  label: string;
}) {
  const options: { value: BankVisibilityLevel | null; label: string; hint: string }[] = allowNone
    ? [{ value: null, label: "No override", hint: "Each subject uses its own setting" }, ...LEVELS]
    : LEVELS;

  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-[var(--color-base-300)] p-1">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            title={option.hint}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer border-none transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: isSelected ? "var(--color-secondary)" : "var(--color-base-100)",
              color: isSelected ? "white" : "var(--color-base-content)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
