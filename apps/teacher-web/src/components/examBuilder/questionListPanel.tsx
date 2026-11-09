import { Plus } from "lucide-react";
import { ChevronDown, ChevronUp, CircleDot, Code2, Shuffle, TextCursorInput, Trash2 } from "lucide-react";
import type {
  BuilderPool,
  BuilderQuestion,
  BuilderSection,
  QuestionType,
} from "../../screens/examBuilder/examBuilderScreen.types";

function typeLabel(type: QuestionType) {
  if (type === "multiple-choice") return "Multiple Choice";
  if (type === "fill-in-the-blank") return "Fill in the Blank";
  return "Coding";
}

function QuestionListItem({
  question,
  isActive,
  onClick,
}: {
  question: BuilderQuestion;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border rounded-xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: isActive ? "var(--color-base-100)" : "transparent",
        borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)",
        outline: "none",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-widest"
          style={{
            color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
            opacity: isActive ? 1 : 0.5,
          }}
        >
          Question {question.number}
        </p>
        {question.type === "coding" ? (
          <Code2 size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        ) : question.type === "fill-in-the-blank" ? (
          <TextCursorInput size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        ) : (
          <CircleDot size={14} style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }} />
        )}
      </div>
      <p className="text-[14px] font-semibold leading-snug mb-0.5" style={{ color: "var(--color-base-content)" }}>
        {question.title}
      </p>
      <p
        className="text-[12px]"
        style={{
          color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
          opacity: isActive ? 1 : 0.5,
        }}
      >
        {typeLabel(question.type)} • {question.points} pts
      </p>
    </button>
  );
}

// one random "pick N of M" pool in the list
function PoolListItem({
  pool,
  isActive,
  onClick,
}: {
  pool: BuilderPool;
  isActive: boolean;
  onClick: () => void;
}) {
  const accent = isActive ? "var(--color-secondary)" : "var(--color-base-content)";
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border rounded-xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: isActive ? "var(--color-base-100)" : "transparent",
        borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)",
        outline: "none",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: accent, opacity: isActive ? 1 : 0.5 }}
        >
          Random pool
        </p>
        <Shuffle size={14} style={{ color: accent, opacity: isActive ? 1 : 0.4 }} />
      </div>
      <p className="text-[14px] font-semibold leading-snug mb-0.5" style={{ color: "var(--color-base-content)" }}>
        {pool.title.trim() || "Untitled pool"}
      </p>
      <p className="text-[12px]" style={{ color: accent, opacity: isActive ? 1 : 0.5 }}>
        Pick {pool.pickCount} of {pool.items.length}
      </p>
    </button>
  );
}

// lets the teacher move the open question or pool into another section
function SectionPicker({
  sections,
  value,
  onChange,
}: {
  sections: BuilderSection[];
  value: string | null | undefined;
  onChange: (sectionId: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-1 -mt-1 mb-1">
      <span className="text-[11px]" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
        Section
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 text-[12px] rounded-lg border px-2 py-1"
        style={{
          backgroundColor: "var(--color-base-100)",
          borderColor: "var(--color-base-300)",
          color: "var(--color-base-content)",
        }}
      >
        {!value && <option value="">No section</option>}
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.title.trim() || "Untitled section"}
          </option>
        ))}
      </select>
    </label>
  );
}

// the title row above a section's questions, with rename / reorder / delete
function SectionHeader({
  section,
  index,
  total,
  isActive,
  readOnly,
  onSelect,
  onRename,
  onMove,
  onDelete,
}: {
  section: BuilderSection;
  index: number;
  total: number;
  isActive: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const iconButton = "w-6 h-6 rounded-md flex items-center justify-center cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70 disabled:opacity-25 disabled:cursor-default";
  return (
    <div
      className="flex items-center gap-1 mt-3 mb-0.5 px-1 border-b pb-1"
      style={{ borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)" }}
    >
      <input
        value={section.title}
        readOnly={readOnly}
        onFocus={onSelect}
        onClick={onSelect}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Section title"
        aria-label={`Title of section ${index + 1}`}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] font-bold uppercase tracking-wide"
        style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)" }}
      />
      {!readOnly && (
        <>
          <button
            type="button"
            className={iconButton}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move section up"
            style={{ color: "var(--color-base-content)" }}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move section down"
            style={{ color: "var(--color-base-content)" }}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={onDelete}
            aria-label="Delete section"
            style={{ color: "var(--color-base-content)" }}
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export function QuestionListPanel({
  questions,
  activeId,
  onSelectQuestion,
  onAddQuestion,
  hideAddButton = false,
  pools = [],
  activePoolId = null,
  onSelectPool,
  sections = [],
  activeSectionId = null,
  sectionsReadOnly = false,
  onSelectSection,
  onAddSection,
  onRenameSection,
  onMoveSection,
  onDeleteSection,
  onMoveItemToSection,
}: {
  questions: BuilderQuestion[];
  activeId: string;
  onSelectQuestion: (id: string) => void;
  pools?: BuilderPool[];
  activePoolId?: string | null;
  onSelectPool?: (id: string) => void;
  onAddQuestion?: () => void;
  onReorderQuestions?: () => void;
  hideAddButton?: boolean;
  sections?: BuilderSection[];
  activeSectionId?: string | null;
  sectionsReadOnly?: boolean; // true while editing a live exam: sections can be seen but not changed
  onSelectSection?: (id: string) => void;
  onAddSection?: () => void;
  onRenameSection?: (id: string, title: string) => void;
  onMoveSection?: (id: string, direction: -1 | 1) => void;
  onDeleteSection?: (id: string) => void;
  onMoveItemToSection?: (kind: "question" | "pool", id: string, sectionId: string) => void;
}) {
  const hasSections = sections.length > 0;
  const sectionIds = new Set(sections.map((section) => section.id));

  // one question row, plus the section picker underneath when it is the open one
  const renderQuestion = (q: BuilderQuestion) => (
    <div key={q.id} className="flex flex-col gap-1.5">
      <QuestionListItem question={q} isActive={q.id === activeId} onClick={() => onSelectQuestion(q.id)} />
      {hasSections && !sectionsReadOnly && q.id === activeId && (
        <SectionPicker
          sections={sections}
          value={q.sectionId}
          onChange={(sectionId) => onMoveItemToSection?.("question", q.id, sectionId)}
        />
      )}
    </div>
  );

  const renderPool = (pool: BuilderPool) => (
    <div key={pool.id} className="flex flex-col gap-1.5">
      <PoolListItem pool={pool} isActive={pool.id === activePoolId} onClick={() => onSelectPool?.(pool.id)} />
      {hasSections && !sectionsReadOnly && pool.id === activePoolId && (
        <SectionPicker
          sections={sections}
          value={pool.sectionId}
          onChange={(sectionId) => onMoveItemToSection?.("pool", pool.id, sectionId)}
        />
      )}
    </div>
  );

  const looseQuestions = hasSections ? questions.filter((q) => !q.sectionId || !sectionIds.has(q.sectionId)) : [];
  const loosePools = hasSections ? pools.filter((p) => !p.sectionId || !sectionIds.has(p.sectionId)) : [];

  return (
    <aside
      className="w-[260px] flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)" }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-base-300)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--color-base-content)" }}>
          Questions
        </h2>
        {!hideAddButton && (
          <button
            onClick={onAddQuestion}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {!hasSections && (
          <>
            {questions.map(renderQuestion)}

            {pools.length > 0 && (
              <>
                <p
                  className="font-mono text-[10px] font-semibold uppercase tracking-widest mt-3 mb-1 px-1"
                  style={{ color: "var(--color-base-content)", opacity: 0.5 }}
                >
                  Random pools
                </p>
                {pools.map(renderPool)}
              </>
            )}
          </>
        )}

        {hasSections && (
          <>
            {(looseQuestions.length > 0 || loosePools.length > 0) && (
              <>
                <p
                  className="font-mono text-[10px] font-semibold uppercase tracking-widest mt-1 mb-1 px-1"
                  style={{ color: "var(--color-base-content)", opacity: 0.5 }}
                >
                  No section
                </p>
                {looseQuestions.map(renderQuestion)}
                {loosePools.map(renderPool)}
              </>
            )}

            {sections.map((section, index) => {
              const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
              const sectionPools = pools.filter((p) => p.sectionId === section.id);
              return (
                <div key={section.id} className="flex flex-col gap-2">
                  <SectionHeader
                    section={section}
                    index={index}
                    total={sections.length}
                    isActive={section.id === activeSectionId}
                    readOnly={sectionsReadOnly}
                    onSelect={() => onSelectSection?.(section.id)}
                    onRename={(title) => onRenameSection?.(section.id, title)}
                    onMove={(direction) => onMoveSection?.(section.id, direction)}
                    onDelete={() => onDeleteSection?.(section.id)}
                  />
                  {sectionQuestions.length === 0 && sectionPools.length === 0 && (
                    <p className="text-[12px] px-1" style={{ color: "var(--color-base-content)", opacity: 0.5 }}>
                      Empty. New questions go into the section you last opened.
                    </p>
                  )}
                  {sectionQuestions.map(renderQuestion)}
                  {sectionPools.map(renderPool)}
                </div>
              );
            })}
          </>
        )}

        {!sectionsReadOnly && (
          <button
            type="button"
            onClick={onAddSection}
            className="mt-3 w-full text-[12px] font-semibold px-3 py-2 rounded-xl border border-dashed cursor-pointer bg-transparent transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)" }}
          >
            {hasSections ? "+ Add section" : "+ Divide into sections"}
          </button>
        )}
      </div>
    </aside>
  );
}