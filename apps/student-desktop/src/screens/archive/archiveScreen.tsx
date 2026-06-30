import { useState } from "react";
import { ArchiveScreenProps } from "./archiveScreen.types";
import { AppHeader } from "../../components/layout/appHeader";
import {
  Code2,
  Sigma,
  Cpu,
  Brain,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const mockStudentName = "Alex";
const mockStudentId = "2021-00001";

interface ArchiveExamEntry {
  id: string;
  examName: string;
  courseCode: string;
  date: string;
  time: string;
  score: string;
  status: "graded" | "pending";
  icon: LucideIcon;
}

const archiveMock: ArchiveExamEntry[] = [
  {
    id: "1",
    examName: "Operating Systems Final Exam",
    courseCode: "CS-380-SEC4",
    date: "Oct 14, 2025",
    time: "14:30 EST",
    score: "92/100",
    status: "graded",
    icon: Code2,
  },
  {
    id: "2",
    examName: "Advanced Mathematics Midterm",
    courseCode: "MTH-301-ADV",
    date: "Oct 08, 2025",
    time: "09:00 EST",
    score: "78/100",
    status: "graded",
    icon: Sigma,
  },
  {
    id: "3",
    examName: "Operating Systems Lab Exam",
    courseCode: "CS-441-OSBE",
    date: "Sep 29, 2025",
    time: "16:15 EST",
    score: "100/100",
    status: "graded",
    icon: Cpu,
  },
  {
    id: "4",
    examName: "Data Structures and Algorithms Final Exam",
    courseCode: "DAT-505-GRAD",
    date: "Sep 22, 2025",
    time: "13:00 EST",
    score: "Calculating...",
    status: "pending",
    icon: Brain,
  },
  {
    id: "5",
    examName: "Cybersecurity Principles Final Exam",
    courseCode: "CYB-301-SEC",
    date: "Sep 15, 2025",
    time: "10:30 EST",
    score: "85/100",
    status: "graded",
    icon: ShieldCheck,
  },
];

const totalExamCount = archiveMock.length;

export function ArchiveScreen(_props: ArchiveScreenProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "graded" | "pending"
  >("all");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const visibleEntries = archiveMock
    .filter((entry) => statusFilter === "all" || entry.status === statusFilter)
    .sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
    });

  function handleReviewExam(entry: ArchiveExamEntry) {
    // Placeholder for review exam logic
    console.log(`Reviewing exam: ${entry.courseCode}`);
  }

  const initials = mockStudentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col">
      <AppHeader />
      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            Previous Assessments
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-[460px]">
            Access detailed reports and performance metrics for all completed
            examinations.
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-5 py-3 text-center shrink-0">
          <span className="block font-[var(--font-label)] text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Total Exams
          </span>
          <span className="block text-[var(--text-primary)] text-xl font-semibold">
            {totalExamCount}
          </span>
        </div>
      </div>

      <main>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "graded" | "pending",
              )
            } // updates which rows show
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">Status: All</option>
            <option value="graded">Status: Graded</option>
            <option value="pending">Status: Pending</option>
          </select>
          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value as "desc" | "asc")
            } // updates row order
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="desc">Sort: Date (Newest First)</option>
            <option value="asc">Sort: Date (Oldest First)</option>
          </select>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                  Exam Name
                </th>
                <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                  Date
                </th>
                <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                  Score
                </th>
                <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Renders one row per entry that survives the current filter/sort */}
              {visibleEntries.map((entry, index) => {
                const ExamIcon = entry.icon; // grabs the icon component for this specific row
                const isLastRow = index === visibleEntries.length - 1;
                return (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td
                      className={`py-4 px-5 ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center shrink-0">
                          <ExamIcon size={16} />
                        </div>
                        <div>
                          <span className="block text-[var(--text-primary)] text-sm font-medium">
                            {entry.examName}
                          </span>
                          <span className="block font-[var(--font-label)] text-xs text-[var(--text-secondary)] mt-0.5">
                            {entry.courseCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`py-4 px-5 text-sm ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                    >
                      <span className="block text-[var(--text-primary)]">
                        {entry.date}
                      </span>
                      <span className="block text-[var(--text-secondary)] text-xs mt-0.5">
                        {entry.time}
                      </span>
                    </td>
                    <td
                      className={`py-4 px-5 text-sm text-[var(--text-primary)] font-medium ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                    >
                      {entry.score}
                    </td>
                    <td
                      className={`py-4 px-5 ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleReviewExam(entry)}
                        className="border border-[var(--accent-blue)]/40 text-[var(--accent-blue)] text-xs font-medium rounded-md px-3 py-1.5 hover:bg-[var(--accent-blue)]/10"
                      >
                        Review Exam
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)] text-xs">
            Showing 1 to {visibleEntries.length} of {totalExamCount} assessments
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-white/5"
            >
              <ChevronLeft size={14} />
            </button>
            {[1, 2, 3, 4].map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`text-xs w-7 h-7 rounded-md ${
                  pageNumber === 1
                    ? "bg-[var(--accent-blue)] text-white" // page 1 always shown as "active" — no real pagination yet
                    : "text-[var(--text-secondary)] hover:bg-white/5"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-white/5"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
