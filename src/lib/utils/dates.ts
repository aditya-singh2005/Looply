import type { GoalCycle } from "@/types";

/** Parse a "YYYY-MM-DD" date string as LOCAL midnight (not UTC midnight). */
function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Replacing '-' with '/' makes JS treat it as a local-time date instead of UTC
  return new Date(dateStr.replace(/-/g, "/"));
}

export function getCurrentQuarterWindow(cycle: GoalCycle): {
  phase: string;
  isOpen: boolean;
  closesIn: number | null;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
} {
  const now = new Date();
  const windows = [
    { phase: "Q1", quarter: "Q1" as const, start: parseLocalDate(cycle.q1_start), end: parseLocalDate(cycle.q1_end) },
    { phase: "Q2", quarter: "Q2" as const, start: parseLocalDate(cycle.q2_start), end: parseLocalDate(cycle.q2_end) },
    { phase: "Q3", quarter: "Q3" as const, start: parseLocalDate(cycle.q3_start), end: parseLocalDate(cycle.q3_end) },
    { phase: "Q4", quarter: "Q4" as const, start: parseLocalDate(cycle.q4_start), end: parseLocalDate(cycle.q4_end) },
  ];
  for (const w of windows) {
    if (!w.start || !w.end) continue;
    if (now >= w.start && now <= w.end) {
      const closesIn = Math.ceil((w.end.getTime() - now.getTime()) / 86400000);
      return { phase: w.phase, isOpen: true, closesIn, quarter: w.quarter };
    }
  }
  // No open window — return the most recently passed quarter as context
  const past = windows
    .filter((w) => w.end && w.end < now)
    .sort((a, b) => b.end!.getTime() - a.end!.getTime());
  const fallback = past[0]?.quarter ?? "Q1";
  return { phase: "Closed", isOpen: false, closesIn: null, quarter: fallback };
}
