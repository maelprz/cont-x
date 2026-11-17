import type { ClassExamStatus, ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";
import { FilterColumns, FilterPopover } from "../shared/filterPopover";

export interface ExamStatusFilters {
  authoring: ExamStatus[];
  delivery: ClassExamStatus[];
}

const authoringOptions = [
  { value: "draft", label: "Draft" },
  { value: "saved", label: "Saved" },
] as const;

const deliveryOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Live" },
  { value: "ended", label: "Ended" },
] as const;

function StatusOptions<T extends string>({ label, options, selected, onChange }: {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-x-2">
        {options.map(({ value, label }) => (
          <label key={value} className="flex min-h-9 items-center gap-2 rounded-md px-1 hover:bg-stone-100">
            <input type="checkbox" className="size-4 accent-[#465a3b]" checked={selected.includes(value)}
              onChange={(event) => onChange(event.target.checked
                ? [...selected, value]
                : selected.filter((status) => status !== value))} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ExamStatusFilter({ value, onChange }: {
  value: ExamStatusFilters;
  onChange: (value: ExamStatusFilters) => void;
}) {
  return (
    <FilterPopover label="Filter by status" activeCount={value.authoring.length + value.delivery.length}
      onClear={() => onChange({ authoring: [], delivery: [] })}>
      <FilterColumns
        first={<StatusOptions label="Exam status" options={authoringOptions} selected={value.authoring}
          onChange={(authoring) => onChange({ ...value, authoring })} />}
        second={<StatusOptions label="Class status" options={deliveryOptions} selected={value.delivery}
          onChange={(delivery) => onChange({ ...value, delivery })} />}
      />
    </FilterPopover>
  );
}
