import type { Goal, GoalAchievement, Quarter, UomType } from "@/types";
import { computeScore } from "./score";
import { format, parseISO } from "date-fns";

export const UOM_LABELS: Record<UomType, string> = {
  numeric_min: "Numeric ↑",
  numeric_max: "Numeric ↓",
  timeline: "Timeline",
  zero: "Zero",
};

export function formatTarget(goal: Pick<Goal, "uom_type" | "target_value" | "target_date">): string {
  switch (goal.uom_type) {
    case "numeric_min":
    case "numeric_max":
      return goal.target_value != null ? String(goal.target_value) : "—";
    case "timeline":
      return goal.target_date ? format(parseISO(goal.target_date), "MMM d, yyyy") : "—";
    case "zero":
      return "0";
    default:
      return "—";
  }
}

export function getAchievementScore(
  goal: Goal,
  achievement: GoalAchievement | undefined
): number | null {
  if (!achievement) return null;
  if (achievement.score != null) return Number(achievement.score);
  return computeScore(
    goal.uom_type,
    goal.target_value,
    goal.target_date,
    achievement.actual_value,
    achievement.actual_date
  );
}

export function getLatestProgress(goal: Goal): number {
  const achievements = goal.goal_achievements ?? [];
  if (!achievements.length) return 0;
  const order: Quarter[] = ["Q4", "Q3", "Q2", "Q1"];
  for (const q of order) {
    const a = achievements.find((x) => x.quarter === q);
    if (a) {
      const score = getAchievementScore(goal, a);
      if (score != null) return Math.round(score);
    }
  }
  return 0;
}

export function formatActual(
  goal: Goal,
  achievement: GoalAchievement | undefined
): string {
  if (!achievement) return "—";
  if (goal.uom_type === "timeline") {
    return achievement.actual_date
      ? format(parseISO(achievement.actual_date), "MMM d, yyyy")
      : "—";
  }
  return achievement.actual_value != null ? String(achievement.actual_value) : "—";
}
