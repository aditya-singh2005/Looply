export type Role = "employee" | "manager" | "admin";
export type UomType = "numeric_min" | "numeric_max" | "timeline" | "zero";
export type GoalStatus = "draft" | "submitted" | "approved" | "returned" | "locked";
export type CheckinStatus = "not_started" | "on_track" | "at_risk" | "off_track" | "completed";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type CycleStatus = "draft" | "active" | "closed";

export interface Department {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department_id: string | null;
  manager_id: string | null;
  avatar_initials: string | null;
}

export interface GoalCycle {
  id: string;
  name: string;
  year: number;
  status: CycleStatus;
  goal_setting_start: string;
  goal_setting_end: string;
  q1_start: string;
  q1_end: string;
  q2_start: string;
  q2_end: string;
  q3_start: string;
  q3_end: string;
  q4_start: string;
  q4_end: string;
  is_active: boolean;
}

export interface ThrustArea {
  id: string;
  name: string;
  color: string;
  bg_color: string;
  user_id?: string;
}

export interface Goal {
  id: string;
  employee_id: string;
  cycle_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: UomType;
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  status: GoalStatus;
  is_shared: boolean;
  locked_at: string | null;
  manager_comment: string | null;
  created_at: string;
  updated_at: string;
  thrust_areas?: ThrustArea | null;
  goal_achievements?: GoalAchievement[];
}

export interface GoalAchievement {
  id: string;
  goal_id: string;
  quarter: Quarter;
  actual_value: number | null;
  actual_date: string | null;
  status: CheckinStatus;
  score: number | null;
  submitted_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  goal_id: string | null;
  action: string;
  entity_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  users?: { name: string; email: string } | null;
}
