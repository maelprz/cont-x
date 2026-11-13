import type { ClassExamStatus } from "../screens/examLibrary/examLibraryScreen.types";
import type { ScreenName } from "./route";

export interface ExamCardNavigation {
  ctaLabel: string;
  targetScreen: ScreenName;
}

// Returns the navigation information for a class exam card based on its status.
export function getClassExamNavigation(status: ClassExamStatus): ExamCardNavigation | null {
  switch (status) {
    case "scheduled":
      return null;
    case "active":
      return { ctaLabel: "View Progress", targetScreen: "studentMonitoring" };
    case "ended":
      return { ctaLabel: "View Results", targetScreen: "examResults" };
  }
}