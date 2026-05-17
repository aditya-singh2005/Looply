"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/useRole";
import {
  getActiveCycle,
  getGoalsByEmployee,
  computeWeightedAverage,
} from "@/lib/supabase/queries";
import { getCurrentQuarterWindow, getCurrentDate } from "@/lib/utils/dates";

import type { Goal, GoalCycle } from "@/types";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { ThrustAreaBadge } from "@/components/shared/ThrustAreaBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmployeeDashboard() {
  const { user, role, mounted } = useRole();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted || !user) return;
    async function load() {
      try {
        setLoading(true);
        const activeCycle = await getActiveCycle();
        setCycle(activeCycle);
        const employeeId = role === "employee" ? user?.id ?? null : null;
        if (!employeeId) return;
        const data = await getGoalsByEmployee(employeeId, activeCycle?.id);
        setGoals(data);
      } catch (e) {
        toast.error("Failed to load dashboard", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mounted, role, user?.id]);

  const window = cycle ? getCurrentQuarterWindow(cycle) : null;
  const activeQuarter = window?.quarter ?? "Q2";
  const avgScore = computeWeightedAverage(goals, activeQuarter);
  const lockedCount = goals.filter((g) => g.status === "locked").length;
  const submittedCount = goals.filter((g) => g.status !== "draft").length;
  
  // Goal Health Score Calculations
  const totalCount = goals.length;
  const completionRate = totalCount > 0 ? Math.round((lockedCount / totalCount) * 100) : 0;
  
  const onTrackCount = goals.reduce((acc, goal) => {
    const ach = goal.goal_achievements?.find((a) => a.quarter === activeQuarter);
    if (ach && (ach.status === "on_track" || ach.status === "completed")) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const lastQuarter = activeQuarter === "Q2" ? "Q1" : activeQuarter === "Q3" ? "Q2" : activeQuarter === "Q4" ? "Q3" : "";
  const lastAvgScore = lastQuarter ? computeWeightedAverage(goals, lastQuarter) : 0;
  const scoreDiff = avgScore - lastAvgScore;
  const trend = scoreDiff > 0 ? "up" : scoreDiff < 0 ? "down" : "flat";

  const greeting = () => {
    const h = getCurrentDate().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (role !== "employee" && mounted) {
    return (
      <div className="rounded-card border border-border bg-white p-12 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg text-warning">
          <Target className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-text-secondary">
          This dashboard is reserved for employee profiles. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero banner — Stitch indigo gradient card */}
      <div className="relative overflow-hidden rounded-card border border-primary/20 bg-gradient-to-br from-primary via-[#4338CA] to-[#312E81] p-6 text-white shadow-card md:flex md:items-center md:justify-between md:p-8">
        <div className="space-y-2 md:max-w-md">
          <p className="text-sm font-medium text-white/80">{greeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {mounted && user ? user.name.split(" ")[0] : "…"}
          </h1>
          <p className="text-sm text-white/70">
            Performance Cycle 2025 · {lockedCount} approved goals · Q2 check-in window
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {submittedCount} goals submitted
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              Avg {Math.round(avgScore)}% achievement
            </span>
          </div>
        </div>
        <div className="mt-6 flex justify-center text-white md:mt-0">
          {loading ? (
            <Skeleton className="h-[88px] w-[88px] text-white rounded-full" />
          ) : (
            <div className="rounded-full bg-white/10 p-2 text-white backdrop-blur">
              <ProgressRing percentage={avgScore} />
            </div>
          )}
        </div>
      </div>

      {window?.isOpen && window.phase.startsWith("Q") && (
        <div className="flex flex-col gap-3 rounded-card border border-warning/30 bg-warning-bg p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="font-semibold text-text-primary">
                {window.phase} check-in window is open
              </p>
              <p className="text-sm text-text-secondary">
                Closes in {window.closesIn} days — submit your quarterly actuals.
              </p>
            </div>
          </div>
          <Link
            href="/checkin"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-warning px-4 text-sm font-medium text-white hover:bg-warning/90"
          >
            Start Check-in
          </Link>
        </div>
      )}

      {/* Goal Health Scorecard Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Completion Rate Card */}
        <div className="rounded-card border border-border bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label-eyebrow text-xs font-bold uppercase tracking-wider text-text-muted">
                Completion Rate
              </p>
              <span className="rounded bg-indigo-50 p-1.5 text-primary">
                <Target className="h-4 w-4" />
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-black text-text-primary tracking-tight">{completionRate}%</p>
                <p className="text-xs text-text-secondary">({lockedCount} of {totalCount} goals locked)</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* On-Track Goals Card */}
        <div className="rounded-card border border-border bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label-eyebrow text-xs font-bold uppercase tracking-wider text-text-muted">
                On-Track Goals
              </p>
              <span className="rounded bg-emerald-50 p-1.5 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-black text-text-primary tracking-tight">
                  {onTrackCount}
                </p>
                <p className="text-xs text-text-secondary">goals on track / completed</p>
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted mt-4">
            Based on active {activeQuarter} achievements.
          </p>
        </div>

        {/* Weighted Score Card */}
        <div className="rounded-card border border-border bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label-eyebrow text-xs font-bold uppercase tracking-wider text-text-muted">
                Weighted Score
              </p>
              <span className="rounded bg-indigo-50 p-1.5 text-primary">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-black text-text-primary tracking-tight">
                  {Math.round(avgScore)}%
                </p>
                {trend === "up" && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ↑ {Math.abs(Math.round(scoreDiff))}% <span className="text-[10px] text-emerald-600/70 font-normal">vs {lastQuarter}</span>
                  </span>
                )}
                {trend === "down" && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    ↓ {Math.abs(Math.round(scoreDiff))}% <span className="text-[10px] text-rose-600/70 font-normal">vs {lastQuarter}</span>
                  </span>
                )}
                {trend === "flat" && lastQuarter && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                    • <span className="text-[10px] text-gray-500/70 font-normal">vs {lastQuarter}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted mt-4">
            Weighted average across approved goals.
          </p>
        </div>
      </div>

      {/* Goals list */}
      <div className="rounded-card border border-border bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-section-header font-semibold text-text-primary">My Goals</h2>
          <Link
            href="/goals"
            className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-container"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                {["Goal", "Thrust Area", "Weight", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td colSpan={5} className="px-5 py-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : goals.slice(0, 6).map((goal) => (
                    <tr
                      key={goal.id}
                      className="h-[52px] border-b border-border-subtle transition-colors hover:bg-surface-container-low/50"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-text-primary">
                        {goal.title}
                      </td>
                      <td className="px-5 py-3">
                        {goal.thrust_areas && (
                          <ThrustAreaBadge area={goal.thrust_areas} />
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary">
                        {goal.weightage}%
                      </td>
                      <td className="px-5 py-3">
                        <GoalStatusBadge status={goal.status} />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/goals/${goal.id}`}
                          className="text-primary hover:text-primary-hover"
                        >
                          <ChevronRight className="h-[18px] w-[18px]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
