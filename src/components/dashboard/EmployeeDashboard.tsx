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
import { getCurrentQuarterWindow } from "@/lib/utils/dates";
import { IDS } from "@/constants";
import type { Goal, GoalCycle } from "@/types";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { ThrustAreaBadge } from "@/components/shared/ThrustAreaBadge";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeeDashboard() {
  const { user, role, mounted } = useRole();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    async function load() {
      try {
        setLoading(true);
        const activeCycle = await getActiveCycle();
        setCycle(activeCycle);
        const employeeId = role === "employee" ? user.id : IDS.users.emp1;
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
  }, [mounted, role, user.id]);

  const window = cycle ? getCurrentQuarterWindow(cycle) : null;
  const avgScore = computeWeightedAverage(goals, window?.quarter ?? "Q2");
  const lockedCount = goals.filter((g) => g.status === "locked").length;
  const submittedCount = goals.filter((g) => g.status !== "draft").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (role !== "employee" && mounted) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center shadow-card">
        <p className="text-text-secondary">
          Switch to <strong>Employee</strong> role to view the employee dashboard, or use the
          sidebar for {role} navigation.
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
            {mounted ? user.name.split(" ")[0] : "…"}
          </h1>
          <p className="text-sm text-white/70">
            Performance Cycle 2025 · {lockedCount} locked goals · Q2 check-in window
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
        <div className="mt-6 flex justify-center md:mt-0">
          {loading ? (
            <Skeleton className="h-[88px] w-[88px] rounded-full" />
          ) : (
            <div className="rounded-full bg-white/10 p-2 backdrop-blur">
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

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Goals Submitted", value: submittedCount, icon: Target },
          { label: "Avg Achievement", value: `${Math.round(avgScore)}%`, icon: TrendingUp },
          {
            label: "Pending Check-in",
            value: window?.isOpen ? window.phase : "Closed",
            icon: Clock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-border bg-white p-5 shadow-card"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">
                {stat.label}
              </p>
              <stat.icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.5} />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            )}
          </div>
        ))}
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
