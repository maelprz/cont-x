import { useId } from "react";
import type { QuestionType } from "../../screens/examBuilder/examBuilderScreen.types";
import { questionTypeLabels } from "../examBuilder/createBlankQuestion";
import { FilterColumns, FilterPopover } from "../shared/filterPopover";
import { TeacherSelect } from "../shared/teacherSelect";
import { TeacherSwitch } from "../shared/teacherSwitch";

type QuestionFilters = {
  type: "all" | QuestionType;
  topicId: string;
  topics: readonly { value: string; label: string }[];
  onTypeChange: (type: "all" | QuestionType) => void;
  onTopicChange: (topicId: string) => void;
};

const typeOptions = [
  { value: "all" as const, label: "All types" },
  ...(Object.keys(questionTypeLabels) as QuestionType[]).map((value) => ({ value, label: questionTypeLabels[value] })),
];

export function QuestionBankFilters({ fields, includeShared, onSharedChange, disabled }: {
  fields?: QuestionFilters;
  includeShared: boolean;
  onSharedChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const count = Number(!!fields && fields.type !== "all") + Number(!!fields?.topicId) + Number(includeShared);

  return (
    <FilterPopover label="Filter questions" activeCount={count} disabled={disabled} onClear={() => {
      fields?.onTypeChange("all");
      fields?.onTopicChange("");
      if (includeShared) onSharedChange(false);
    }}>
      {fields && (
        <FilterColumns
          first={<>
            <label htmlFor={id + "-type"} className="mb-1 block font-semibold">Question type</label>
            <TeacherSelect id={id + "-type"} label="Filter by type" options={typeOptions}
              value={fields.type} onChange={fields.onTypeChange} disabled={disabled} />
          </>}
          second={<>
            <label htmlFor={id + "-topic"} className="mb-1 block font-semibold">Topic</label>
            <TeacherSelect id={id + "-topic"} label="Filter by topic" options={fields.topics}
              value={fields.topicId} onChange={fields.onTopicChange} disabled={disabled} />
          </>}
        />
      )}
      <div className={fields ? "mt-2 border-t border-[var(--color-base-300)] pt-2" : undefined}>
        <TeacherSwitch label="Show shared questions" checked={includeShared} onChange={onSharedChange} disabled={disabled} />
      </div>
    </FilterPopover>
  );
}
