import type { GoalCycle } from "@/types";

export function getCurrentQuarterWindow(cycle: GoalCycle): {
  phase: string;
  isOpen: boolean;
  closesIn: number | null;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
} {
  const now = new Date();
  const windows = [
    { phase: "Goal Setting", start: cycle.goal_setting_start, end: cycle.goal_setting_end },
    { phase: "Q1", quarter: "Q1" as const, start: cycle.q1_start, end: cycle.q1_end },
    { phase: "Q2", quarter: "Q2" as const, start: cycle.q2_start, end: cycle.q2_end },
    { phase: "Q3", quarter: "Q3" as const, start: cycle.q3_start, end: cycle.q3_end },
    { phase: "Q4", quarter: "Q4" as const, start: cycle.q4_start, end: cycle.q4_end },
  ];
  for (const w of windows) {
    const start = new Date(w.start);
    const end = new Date(w.end);
    if (now >= start && now <= end) {
      const closesIn = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      return { phase: w.phase, isOpen: true, closesIn, quarter: w.quarter };
    }
  }
  return { phase: "Closed", isOpen: false, closesIn: null };
}
