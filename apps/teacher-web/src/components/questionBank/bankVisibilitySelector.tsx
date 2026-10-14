import type { BankVisibilityLevel } from "../../services/bankVisibilityService";

const LEVELS: { value: BankVisibilityLevel; label: string; hint: string }[] = [
  { value: "course", label: "Course", hint: "Teachers assigned to this subject" },
  { value: "account", label: "Account", hint: "Teachers who share any of your subjects" },
  { value: "department", label: "Department", hint: "Every teacher in your department" },
];

// Segmented control for who can see a teacher's bank questions. With
// allowNone it also offers "No override" — used for the main question bank
// setting, where leaving it unset hands control back to each subject.
export function BankVisibilitySelector({
  value,
  onChange,
  disabled,
  allowNone,
}: {
  value: BankVisibilityLevel | null;
  onChange: (level: BankVisibilityLevel | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
}) {
  const options: { value: BankVisibilityLevel | null; label: string; hint: string }[] = allowNone
    ? [{ value: null, label: "No override", hint: "Each subject uses its own setting" }, ...LEVELS]
    : LEVELS;

  return (
    <div className="inline-flex rounded-lg border overflow-hidden border-[var(--color-base-300)]">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            title={option.hint}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="px-3 py-1.5 text-[12px] font-medium cursor-pointer border-none transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
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