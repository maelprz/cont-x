import type { BankVisibilityLevel, BankVisibilitySettings } from "../../services/bankVisibilityService";
import { ExamDialog, examSecondary } from "../examLibrary/examDialog";

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

export function BankSharing({ subject, settings, isLoading, isSaving, error, isOpen, onOpen, onClose, onMainChange, onSubjectChange }: {
  subject: { id: string; name: string } | null;
  settings: BankVisibilitySettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onMainChange: (level: BankVisibilityLevel | null) => void;
  onSubjectChange: (subjectId: string, level: BankVisibilityLevel) => void;
}) {
  const effective = settings?.mainLevel ?? (subject && settings?.subjectLevels[subject.id]) ?? "private";
  const scope = subject && settings ? LEVELS.find((option) => option.value === effective)?.label : undefined;
  const disabled = isLoading || isSaving || !settings;

  return <>
    <button type="button" className={examSecondary} onClick={onOpen} aria-haspopup="dialog">
      Sharing{scope ? ` · ${scope}` : ""}
    </button>
    {isOpen && (
      <ExamDialog title="Question bank sharing" busy={isSaving} onClose={onClose} footer={
        <button type="button" className={examSecondary} onClick={onClose} disabled={isSaving}>Done</button>
      }>
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Main bank override</h3>
            <p className="text-sm text-stone-600">Applies to all subjects. With No override, each subject uses its saved setting or defaults to Only me.</p>
            <BankVisibilitySelector allowNone label="Main bank override" value={settings?.mainLevel} disabled={disabled} onChange={onMainChange} />
          </section>
          {subject && (
            <section className="space-y-2 border-t border-[var(--color-base-300)] pt-4">
              <h3 className="wrap-anywhere text-sm font-semibold">{subject.name}</h3>
              <p className="text-sm text-stone-600">{settings?.mainLevel ? "The main override applies to this subject." : "Controls who can see the questions you create in this subject."}</p>
              <BankVisibilitySelector label={`Sharing for ${subject.name}`} value={settings ? effective : undefined} disabled={disabled || !!settings?.mainLevel} onChange={(level) => level && onSubjectChange(subject.id, level)} />
            </section>
          )}
          {isLoading && <p role="status" className="text-sm text-stone-600">Loading sharing settings…</p>}
          {isSaving && <p role="status" className="text-sm text-stone-600">Saving sharing settings…</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </ExamDialog>
    )}
  </>;
}
