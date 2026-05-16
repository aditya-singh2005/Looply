"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useGoals } from "@/lib/hooks/useGoals";
import { getActiveCycle } from "@/lib/supabase/queries";
import { MAX_GOALS, IDS } from "@/constants";
import type { Goal, GoalCycle, GoalStatus } from "@/types";
import { FilterPills, type GoalFilter } from "./FilterPills";
import { WeightageBar } from "./WeightageBar";
import { GoalRow } from "./GoalRow";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";

function countByStatus(goals: Goal[]): Record<GoalFilter, number> {
  const base: Record<GoalFilter, number> = {
    all: goals.length,
    draft: 0,
    submitted: 0,
    approved: 0,
    returned: 0,
    locked: 0,
  };
  for (const g of goals) {
    base[g.status as GoalStatus]++;
  }
  return base;
}

export function MyGoalsPage() {
  const { user, role, mounted } = useRole();
  const employeeId = role === "employee" ? user.id : IDS.users.emp1;
  const { goals, loading, refetch } = useGoals(mounted ? employeeId : null);
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);

  useEffect(() => {
    getActiveCycle().then(setCycle).catch(() => {});
  }, []);

  const counts = useMemo(() => countByStatus(goals), [goals]);

  const filtered = useMemo(() => {
    if (filter === "all") return goals;
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0);
  const atLimit = goals.length >= MAX_GOALS;
  const weightOk = totalWeight === 100;

  if (role !== "employee" && mounted) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center shadow-card">
        <p className="text-text-secondary">
          Switch to <strong>Employee</strong> to view My Goals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-gray-900">
            My Goals
          </h1>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            Performance Cycle 2025
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {goals.length} of {MAX_GOALS} goals
          </span>
          {atLimit ? (
            <Tooltip>
              <TooltipTrigger
                className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg bg-gray-300 px-4 text-sm font-medium text-gray-500"
                disabled
              >
                <Plus className="h-4 w-4" />
                Add Goal
              </TooltipTrigger>
              <TooltipContent>Maximum 8 goals reached for this cycle</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/goals/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </Link>
          )}
        </div>
      </div>

      {/* Weightage summary */}
      {goals.length > 0 && (
        <div className="rounded-card border border-border bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Weightage Allocation</span>
            <span
              className={
                weightOk
                  ? "text-sm font-bold text-success"
                  : "text-sm font-bold text-danger"
              }
            >
              {totalWeight}%
            </span>
          </div>
          <WeightageBar goals={goals} showLegend />
        </div>
      )}

      {/* Filters */}
      {goals.length > 0 && (
        <FilterPills active={filter} onChange={setFilter} counts={counts} />
      )}

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-card border border-border bg-white shadow-card">
          <EmptyState />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-white py-16 text-center shadow-card">
          <p className="font-semibold text-gray-700">No goals match this filter</p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white shadow-card">
          <table className="w-full min-w-[900px] table-fixed">
            <thead>
              <tr className="h-11 border-b border-border-subtle bg-gray-50">
                {["Goal", "Thrust Area", "Weight", "Target", "Status", "Progress"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  expanded={expandedId === goal.id}
                  onToggle={() =>
                    setExpandedId((id) => (id === goal.id ? null : goal.id))
                  }
                  onUpdated={refetch}
                  cycle={cycle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
