import { useId } from "react";
import type { QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";
import { questionTypeLabels } from "../examBuilder/createBlankQuestion";
import { FilterColumns, FilterPopover } from "../shared/filterPopover";
import { TeacherSelect } from "../shared/teacherSelect";
import { TeacherSwitch } from "../shared/teacherSwitch";

type FilterOption<T extends string> = { value: T; label: string };

type SingleQuestionFilters = {
  mode?: "single";
  type: "all" | QuestionType;
  topicId: string;
  topics: readonly FilterOption<string>[];
  onTypeChange: (type: "all" | QuestionType) => void;
  onTopicChange: (topicId: string) => void;
};

type MultipleQuestionFilters = {
  mode: "multiple";
  types: QuestionType[];
  topicIds: string[];
  topics: readonly FilterOption<string>[];
  onTypeChange: (types: QuestionType[]) => void;
  onTopicChange: (topicIds: string[]) => void;
};

const typeOptions = (Object.keys(questionTypeLabels) as QuestionType[])
  .map((value) => ({ value, label: questionTypeLabels[value] }));
const singleTypeOptions = [{ value: "all" as const, label: "All types" }, ...typeOptions];

export function CheckboxFilters<T extends string>({ label, options, selected, onChange, disabled,
  optionsClassName = "max-h-40 overflow-y-auto overscroll-contain" }: {
  label: string;
  options: readonly FilterOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  disabled?: boolean;
  optionsClassName?: string;
}) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1 font-semibold">{label}</legend>
      {options.length > 0 ? (
        <div className={optionsClassName}>
          {options.map(({ value, label: optionLabel }) => (
            <label key={value} className="flex min-h-9 items-center gap-2 rounded-md px-1 hover:bg-stone-100">
              <input type="checkbox" className="size-4 shrink-0 accent-[#465a3b]" checked={selected.includes(value)}
                onChange={(event) => onChange(event.target.checked
                  ? [...selected, value]
                  : selected.filter((selection) => selection !== value))} />
              <span className="min-w-0 wrap-anywhere">{optionLabel}</span>
            </label>
          ))}
        </div>
      ) : <p className="text-stone-600">No topics available.</p>}
    </fieldset>
  );
}

export function QuestionBankFilters({ fields, includeShared, onSharedChange, disabled }: {
  fields: SingleQuestionFilters | MultipleQuestionFilters;
  includeShared: boolean;
  onSharedChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const count = Number(includeShared) + (fields.mode === "multiple"
    ? fields.types.length + fields.topicIds.length
    : Number(fields.type !== "all") + Number(Boolean(fields.topicId)));

  return (
    <FilterPopover label="Filter questions" activeCount={count} disabled={disabled} onClear={() => {
      if (fields.mode === "multiple") {
        fields.onTypeChange([]);
        fields.onTopicChange([]);
      } else {
        fields.onTypeChange("all");
        fields.onTopicChange("");
      }
      if (includeShared) onSharedChange(false);
    }}>
      {fields.mode === "multiple" ? (
        <FilterColumns
          first={<CheckboxFilters label="Question types" options={typeOptions}
            selected={fields.types} onChange={fields.onTypeChange} disabled={disabled} />}
          second={<CheckboxFilters label="Topics" options={fields.topics}
            selected={fields.topicIds} onChange={fields.onTopicChange} disabled={disabled} />}
        />
      ) : (
        <FilterColumns
          first={<>
            <label htmlFor={id + "-type"} className="mb-1 block font-semibold">Question type</label>
            <TeacherSelect id={id + "-type"} label="Filter by type" options={singleTypeOptions}
              value={fields.type} onChange={fields.onTypeChange} disabled={disabled} />
          </>}
          second={<>
            <label htmlFor={id + "-topic"} className="mb-1 block font-semibold">Topic</label>
            <TeacherSelect id={id + "-topic"} label="Filter by topic" options={fields.topics}
              value={fields.topicId} onChange={fields.onTopicChange} disabled={disabled} />
          </>}
        />
      )}
      <div className="mt-2 border-t border-[var(--color-base-300)] pt-2">
        <TeacherSwitch label="Show shared questions" checked={includeShared} onChange={onSharedChange} disabled={disabled} />
      </div>
    </FilterPopover>
  );
}
