import { createClient } from "./client";
import type { Goal, GoalCycle } from "@/types";
import { computeScore } from "@/lib/utils/score";

export async function getActiveCycle() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_cycles")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data as GoalCycle | null;
}

export async function getGoalsByEmployee(employeeId: string, cycleId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("goals")
    .select("*, thrust_areas(*), goal_achievements(*)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: true });
  if (cycleId) query = query.eq("cycle_id", cycleId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export function computeWeightedAverage(goals: Goal[], quarter: string = "Q2"): number {
  const locked = goals.filter((g) => g.status === "locked");
  if (!locked.length) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const goal of locked) {
    const achievement = goal.goal_achievements?.find((a) => a.quarter === quarter);
    const score =
      achievement?.score ??
      computeScore(
        goal.uom_type,
        goal.target_value,
        goal.target_date,
        achievement?.actual_value ?? null,
        achievement?.actual_date ?? null
      );
    if (score != null) {
      weightedSum += score * Number(goal.weightage);
      totalWeight += Number(goal.weightage);
    }
  }
  return totalWeight ? weightedSum / totalWeight : 0;
}

export async function getTeamMembers(managerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("manager_id", managerId);
  if (error) throw error;
  return data ?? [];
}

export async function getSubmittedGoalsForTeam(managerId: string) {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("manager_id", managerId);
  if (!members?.length) return [];
  const ids = members.map((m) => m.id);
  const { data, error } = await supabase
    .from("goals")
    .select("*, thrust_areas(*), users!goals_employee_id_fkey(name, email)")
    .in("employee_id", ids)
    .eq("status", "submitted");
  if (error) throw error;
  return data ?? [];
}
