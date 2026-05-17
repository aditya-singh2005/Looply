"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Send, Lock } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useGoals } from "@/lib/hooks/useGoals";
import { getActiveCycle } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/supabase/audit";
import { MAX_GOALS } from "@/constants";
import type { Goal, GoalCycle } from "@/types";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    const status = g.status === "locked" ? "approved" : g.status;
    base[status as GoalFilter]++;
  }
  return base;
}

function isWindowOpen(cycle: GoalCycle | null): { open: boolean; reason: string } {
  if (!cycle) return { open: false, reason: "No active performance cycle found." };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(cycle.goal_setting_start);
  const end = new Date(cycle.goal_setting_end);
  if (today < start) {
    return {
      open: false,
      reason: `Goal setting window is closed. Opens ${start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`,
    };
  }
  if (today > end) {
    return { open: false, reason: "Goal setting period has ended for this cycle." };
  }
  return { open: true, reason: "" };
}

export function MyGoalsPage() {
  const { user, role, mounted } = useRole();
  const employeeId = role === "employee" ? user?.id ?? null : null;
  const { goals, loading, refetch } = useGoals(mounted && employeeId ? employeeId : null);
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  useEffect(() => {
    getActiveCycle().then(setCycle).catch(() => {});
  }, []);

  const counts = useMemo(() => countByStatus(goals), [goals]);

  const filtered = useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "approved") {
      return goals.filter((g) => g.status === "approved" || g.status === "locked");
    }
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0);
  const atLimit = goals.length >= MAX_GOALS;
  const weightOk = totalWeight === 100;
  const hasDraft = goals.some((g) => g.status === "draft");
  const canBatchSubmit = weightOk && hasDraft;

  const windowStatus = useMemo(() => isWindowOpen(cycle), [cycle]);

  const handleBatchSubmit = async () => {
    if (!user || !canBatchSubmit) return;
    setBatchSubmitting(true);
    try {
      const supabase = createClient();
      const draftGoals = goals.filter((g) => g.status === "draft");
      const ids = draftGoals.map((g) => g.id);
      const { error } = await supabase
        .from("goals")
        .update({ status: "submitted" })
        .in("id", ids);
      if (error) throw error;
      if (user.manager_id) {
        await supabase.from("notifications").insert({
          user_id: user.manager_id,
          title: "Goals Submitted for Approval",
          body: `${user.name} has submitted ${ids.length} goal${ids.length > 1 ? "s" : ""} for approval.`,
          is_read: false
        });
      }
      await logAudit({
        userId: user.id,
        action: "BATCH_SUBMITTED",
        entityType: "goal",
        newValue: { count: ids.length, status: "submitted" },
      });
      toast.success(`${ids.length} goal${ids.length > 1 ? "s" : ""} submitted for approval!`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit goals");
    } finally {
      setBatchSubmitting(false);
    }
  };

  if (role !== "employee" && mounted) {
    return (
      <div className="rounded-card border border-border bg-white p-12 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg text-warning">
          <Plus className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-text-secondary">
          Personal goal management is available for employee roles only.
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
          {/* FIX 9: dynamic cycle name */}
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {cycle?.name ?? "Loading..."}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">
            {goals.length} of {MAX_GOALS} goals · {totalWeight}% allocated
          </span>

          {/* FIX 1: Submit All Goals button */}
          {goals.length > 0 && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Button
                  size="sm"
                  disabled={!canBatchSubmit || batchSubmitting || !windowStatus.open}
                  onClick={handleBatchSubmit}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {batchSubmitting ? "Submitting..." : "Submit All for Approval"}
                </Button>
              </TooltipTrigger>
              {(!canBatchSubmit || !windowStatus.open) && (
                <TooltipContent>
                  {!windowStatus.open
                    ? windowStatus.reason
                    : !weightOk
                    ? `Total weightage must equal 100% to submit (currently ${totalWeight}%)`
                    : "No draft goals to submit"}
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* FIX 3: Enforce goal-setting window for Add Goal button */}
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
          ) : !windowStatus.open ? (
            <Tooltip>
              <TooltipTrigger className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg bg-gray-200 px-4 text-sm font-medium text-gray-400">
                <Lock className="h-4 w-4" />
                Add Goal
              </TooltipTrigger>
              <TooltipContent>{windowStatus.reason}</TooltipContent>
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

      {/* Goal-setting window closed banner */}
      {!windowStatus.open && cycle && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {windowStatus.reason}
        </div>
      )}

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
              {totalWeight}% {weightOk ? "✓ Ready to submit" : `(need ${100 - totalWeight}% more)`}
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
