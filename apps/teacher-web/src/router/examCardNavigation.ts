import type { ExamStatus } from "../screens/examLibrary/examLibraryScreen.types";
import type { ScreenName } from "./route";

// What one status-driven card CTA needs: what to say, and where to go.
export interface ExamCardNavigation {
  ctaLabel: string; // text shown on the CTA button
  targetScreen: ScreenName; // which screen clicking it should open
}

// Decides where an exam's card should navigate, and what its button
// should say, based purely on the exam's current status.
export function getExamCardNavigation(status: ExamStatus): ExamCardNavigation {
  switch (status) {
    case "draft":
      return { ctaLabel: "Continue Building", targetScreen: "examBuilder" };
    case "saved":
      return { ctaLabel: "Edit Exam", targetScreen: "examBuilder" };
    case "active":
      return { ctaLabel: "View Progress", targetScreen: "violationMonitoring" };
    case "ended":
      return { ctaLabel: "View Results", targetScreen: "examResults" };
  }
}