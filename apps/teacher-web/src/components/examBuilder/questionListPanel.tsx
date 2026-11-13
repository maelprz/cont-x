import { useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { ChevronDown, ChevronRight, ChevronUp, CircleDot, Code2, GripVertical, Plus, Shuffle, TextCursorInput, Trash2 } from "lucide-react";
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

function QuestionListItem({ question, isActive, onClick }: {
  question: BuilderQuestion;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = question.type === "coding" ? Code2 : question.type === "fill-in-the-blank" ? TextCursorInput : CircleDot;
  return (
    <button type="button" aria-pressed={isActive} onClick={onClick}
      className={`flex w-full min-w-0 items-start gap-2 rounded-md px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-[#465a3b] ${isActive ? "bg-[#e9eee3]" : "hover:bg-stone-100"}`}>
      <span className="shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-stone-600">Q{question.number}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold">{question.title || "Untitled question"}</span>
        <span className="block text-xs text-stone-600">{typeLabel(question.type)} · {question.points} pts</span>
      </span>
      <Icon aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-stone-500" />
    </button>
  );
}

function PoolListItem({ pool, isActive, onClick }: {
  pool: BuilderPool;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={isActive} onClick={onClick}
      className={`flex w-full min-w-0 items-start gap-2 rounded-md px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-[#465a3b] ${isActive ? "bg-[#e9eee3]" : "hover:bg-stone-100"}`}>
      <Shuffle aria-hidden="true" size={15} className="mt-1 shrink-0 text-stone-500" />
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold">{pool.title.trim() || "Untitled pool"}</span>
        <span className="block text-xs text-stone-600">Random pool · Pick {pool.pickCount} of {pool.items.length}</span>
      </span>
    </button>
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
  collapsed,
  contentsId,
  itemCount,
  onToggle,
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
  collapsed: boolean;
  contentsId: string;
  itemCount: number;
  onToggle: () => void;
  onRename: (title: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const iconButton = "grid size-6 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-stone-200 focus-visible:outline-2 disabled:cursor-default disabled:opacity-25";
  return (
    <div
      className="mt-2 flex items-center gap-0.5 border-b border-stone-200 px-1 pb-1"
    >
      <button type="button" className={iconButton} aria-expanded={!collapsed} aria-controls={contentsId}
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${section.title.trim() || "section"}`} onClick={onToggle}>
        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
      </button>
      <input
        value={section.title}
        readOnly={readOnly}
        onFocus={onSelect}
        onClick={onSelect}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Section title"
        aria-label={`Title of section ${index + 1}`}
        className="min-w-0 flex-1 rounded bg-transparent text-xs font-semibold focus-visible:outline-2"
        style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)" }}
      />
      <span className="shrink-0 text-[11px] tabular-nums text-stone-500" title={`${itemCount} items`}>{itemCount}</span>
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
            disabled={total === 1}
            title={total === 1 ? "An exam must have at least one section" : undefined}
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
  hideAddButton?: boolean;
  sections?: BuilderSection[];
  activeSectionId?: string | null;
  sectionsReadOnly?: boolean; // true while editing a live exam: sections can be seen but not changed
  onSelectSection?: (id: string) => void;
  onAddSection?: () => void;
  onRenameSection?: (id: string, title: string) => void;
  onMoveSection?: (id: string, direction: -1 | 1) => void;
  onDeleteSection?: (id: string) => void;
  onMoveItemToSection?: (kind: "question" | "pool", id: string, sectionId: string, placement?: { questionId: string; after: boolean }) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [dragged, setDragged] = useState<{ kind: "question" | "pool"; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const canMove = !sectionsReadOnly && !!onMoveItemToSection;

  function expand(sectionId: string) {
    setCollapsedSections((previous) => {
      if (!previous.has(sectionId)) return previous;
      const next = new Set(previous);
      next.delete(sectionId);
      return next;
    });
  }

  function move(kind: "question" | "pool", id: string, sectionId: string, placement?: { questionId: string; after: boolean }) {
    onMoveItemToSection?.(kind, id, sectionId, placement);
    if (sectionId) expand(sectionId);
    setAnnouncement(`Moved ${kind} to ${sections.find((section) => section.id === sectionId)?.title || "Untitled section"}.`);
  }

  function endDrag() {
    setDragged(null);
    setDropTarget(null);
  }

  function allowDrop(event: DragEvent, key: string) {
    if (!canMove || !dragged) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    if (dropTarget !== key) setDropTarget(key);
  }

  function drop(event: DragEvent, sectionId: string, placement?: { questionId: string; after: boolean }) {
    if (!canMove || !dragged) return;
    event.preventDefault();
    event.stopPropagation();
    if (dragged.id !== placement?.questionId) move(dragged.kind, dragged.id, sectionId, placement);
    endDrag();
  }

  function questionPlacement(event: DragEvent<HTMLDivElement>, questionId: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { questionId, after: event.clientY > bounds.top + bounds.height / 2 };
  }

  function renderItem(kind: "question" | "pool", id: string, sectionId: string, title: string, content: ReactNode) {
    const rowTarget = kind === "question" && dragged?.kind === "question" && dragged.id !== id;
    return (
      <div key={id} className={`relative flex min-w-0 items-center gap-0.5 ${dragged?.id === id ? "opacity-55" : ""}`}
        onDragOver={rowTarget ? (event) => {
          const placement = questionPlacement(event, id);
          allowDrop(event, `${id}:${placement.after ? "after" : "before"}`);
        } : undefined}
        onDrop={rowTarget ? (event) => drop(event, sectionId, questionPlacement(event, id)) : undefined}>
        {dropTarget === `${id}:before` && <span className="pointer-events-none absolute inset-x-1 top-0 z-10 border-t-2 border-[#465a3b]" />}
        {dropTarget === `${id}:after` && <span className="pointer-events-none absolute inset-x-1 bottom-0 z-10 border-b-2 border-[#465a3b]" />}
        {canMove && (sections.length > 1 || kind === "question" && questions.length > 1) && (
          <span draggable title={`Drag to move ${title}`}
            className="grid size-6 shrink-0 cursor-grab select-none place-items-center rounded text-stone-500 hover:bg-stone-200 active:cursor-grabbing"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", title);
              const row = event.currentTarget.parentElement;
              if (row) event.dataTransfer.setDragImage(row, 12, 12);
              setDragged({ kind, id });
            }}
            onDragEnd={endDrag}>
            <GripVertical size={15} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">{content}</div>
      </div>
    );
  }

  const renderQuestion = (question: BuilderQuestion, sectionId: string) =>
    renderItem("question", question.id, sectionId, question.title || `question ${question.number}`,
      <QuestionListItem question={question} isActive={question.id === activeId} onClick={() => onSelectQuestion(question.id)} />);
  const renderPool = (pool: BuilderPool, sectionId: string) =>
    renderItem("pool", pool.id, sectionId, pool.title.trim() || "untitled pool",
      <PoolListItem pool={pool} isActive={pool.id === activePoolId} onClick={() => onSelectPool?.(pool.id)} />);


  return (
    <aside aria-label="Exam outline" className="flex max-h-52 w-full shrink-0 flex-col overflow-hidden border-b border-[var(--color-base-300)] bg-[var(--color-base-200)] md:max-h-none md:w-[230px] md:border-r md:border-b-0 xl:w-[270px]">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-[var(--color-base-300)] px-4 py-3.5">
        <h2 className="text-[15px] font-bold">Exam outline</h2>
        {!hideAddButton && (
          <button type="button" onClick={onAddQuestion} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#465a3b] hover:bg-[#e9eee3] focus-visible:outline-2">
            <Plus size={15} aria-hidden="true" /> Add question
          </button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2" onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);
      }}>
        {sections.map((section, index) => {
          const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
          const sectionPools = pools.filter((pool) => pool.sectionId === section.id);
          const collapsed = collapsedSections.has(section.id);
          const contentsId = `section-items-${section.id}`;
          return (
            <div key={section.id} className={`relative rounded-md ${dropTarget === section.id ? "bg-[#e9eee3]" : ""}`}
              onDragOver={(event) => allowDrop(event, section.id)} onDrop={(event) => drop(event, section.id)}>
              <SectionHeader section={section} index={index} total={sections.length}
                isActive={section.id === activeSectionId} readOnly={sectionsReadOnly}
                collapsed={collapsed} contentsId={contentsId} itemCount={sectionQuestions.length + sectionPools.length}
                onSelect={() => onSelectSection?.(section.id)}
                onToggle={() => {
                  setCollapsedSections((previous) => {
                    const next = new Set(previous);
                    if (collapsed) next.delete(section.id); else next.add(section.id);
                    return next;
                  });
                  if (collapsed) onSelectSection?.(section.id);
                }}
                onRename={(title) => onRenameSection?.(section.id, title)}
                onMove={(direction) => onMoveSection?.(section.id, direction)}
                onDelete={() => onDeleteSection?.(section.id)} />
              {dragged && <div aria-hidden="true" className={`absolute inset-x-0 top-0 z-10 rounded-md ${collapsed ? "bottom-0" : "h-8"}`} />}
              <div id={contentsId} hidden={collapsed} className="space-y-1 pt-1">
                {sectionQuestions.length === 0 && sectionPools.length === 0 && (
                  <p className="px-2 py-2 text-xs text-stone-600">{canMove ? "Drop questions here" : "No questions or pools"}</p>
                )}
                {sectionQuestions.map((question) => renderQuestion(question, section.id))}
                {sectionPools.map((pool) => renderPool(pool, section.id))}
              </div>
            </div>
          );
        })}
        {!sectionsReadOnly && (
          <button type="button" onClick={onAddSection}
            className="mt-3 w-full cursor-pointer rounded-lg border border-dashed border-[var(--color-base-300)] px-3 py-2 text-xs font-semibold hover:bg-stone-100 focus-visible:outline-2">
            + Add section
          </button>
        )}
      </div>
    </aside>
  );
}
