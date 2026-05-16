"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Lock, MessageSquare, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Goal, Quarter } from "@/types";
import { cn } from "@/lib/utils";
import { ThrustAreaBadge } from "@/components/shared/ThrustAreaBadge";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { ScorePill } from "@/components/checkin/ScorePill";
import {
  formatTarget,
  UOM_LABELS,
  getLatestProgress,
  formatActual,
  getAchievementScore,
} from "@/lib/utils/goal-format";
import { getCurrentQuarterWindow } from "@/lib/utils/dates";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/supabase/audit";
import { useRole } from "@/lib/hooks/useRole";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GoalCycle } from "@/types";

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export function GoalRow({
  goal,
  expanded,
  onToggle,
  onUpdated,
  cycle,
}: {
  goal: Goal;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
  cycle: GoalCycle | null;
}) {
  const { user } = useRole();
  const [busy, setBusy] = useState(false);
  const thrustColor = goal.thrust_areas?.color ?? "#4F46E5";
  const progress = getLatestProgress(goal);
  const window = cycle ? getCurrentQuarterWindow(cycle) : null;
  const currentQuarter = window?.quarter;

  async function updateStatus(status: Goal["status"], action: string) {
    try {
      setBusy(true);
      const supabase = createClient();
      const oldStatus = goal.status;
      const { error } = await supabase
        .from("goals")
        .update({ status })
        .eq("id", goal.id);
      if (error) throw error;
      await logAudit({
        userId: user.id,
        goalId: goal.id,
        action,
        entityType: "goal",
        oldValue: { status: oldStatus },
        newValue: { status },
      });
      toast.success(
        status === "draft" ? "Submission withdrawn" : "Goal updated"
      );
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGoal() {
    if (!confirm("Delete this goal? This cannot be undone.")) return;
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase.from("goals").delete().eq("id", goal.id);
      if (error) throw error;
      await logAudit({
        userId: user.id,
        goalId: goal.id,
        action: "DELETED",
        entityType: "goal",
        oldValue: { title: goal.title },
        newValue: null,
      });
      toast.success("Goal deleted");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr
        onClick={onToggle}
        className="h-[52px] cursor-pointer border-b border-border-subtle transition-colors hover:bg-gray-50"
      >
        <td className="w-[35%] max-w-0 px-5 py-2">
          <div
            className="flex min-w-0 items-start gap-3 border-l-4 pl-3"
            style={{ borderColor: thrustColor }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {goal.title}
                </p>
                {(goal.status === "locked" || goal.status === "approved") && (
                  <Lock className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.5} />
                )}
                {goal.status === "returned" && (
                  <Popover>
                    <PopoverTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 rounded-full bg-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-danger"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Returned
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-sm" onClick={(e) => e.stopPropagation()}>
                      <p className="font-semibold">Manager comment</p>
                      <p className="mt-1 text-muted-foreground">
                        {goal.manager_comment || "No comment provided."}
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {goal.description && (
                <p className="truncate text-xs text-gray-400">{goal.description}</p>
              )}
            </div>
          </div>
        </td>
        <td className="w-[15%] px-4 py-2">
          {goal.thrust_areas && <ThrustAreaBadge area={goal.thrust_areas} />}
        </td>
        <td className="w-[8%] px-4 py-2 text-right text-sm font-semibold text-gray-700">
          {goal.weightage}%
        </td>
        <td className="w-[14%] px-4 py-2">
          <p className="text-sm text-gray-700">{formatTarget(goal)}</p>
          <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {UOM_LABELS[goal.uom_type]}
          </span>
        </td>
        <td className="w-[14%] px-4 py-2">
          <GoalStatusBadge status={goal.status} showLock={goal.status === "locked"} />
        </td>
        <td className="w-[14%] px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-xl bg-gray-100">
              <div
                className="h-full rounded-xl bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-xs text-gray-600">{progress}%</span>
          </div>
        </td>
      </tr>
      <tr className="border-b border-border-subtle">
        <td colSpan={6} className="p-0">
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-in-out",
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden">
              <div className="bg-primary-subtle/60 px-6 py-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">Goal Details</h4>
                    <p className="text-sm text-gray-600">
                      {goal.description || "No description."}
                    </p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>
                        Created:{" "}
                        {format(parseISO(goal.created_at), "MMM d, yyyy")}
                      </p>
                      {goal.status !== "draft" && (
                        <p>
                          Submitted:{" "}
                          {format(parseISO(goal.updated_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {goal.status === "returned" && goal.manager_comment && (
                      <div className="flex gap-2 rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                        <div>
                          <p className="font-semibold text-danger">Manager feedback</p>
                          <p className="text-gray-700">{goal.manager_comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Achievement by Quarter
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {QUARTERS.map((q) => {
                        const a = goal.goal_achievements?.find((x) => x.quarter === q);
                        const score = getAchievementScore(goal, a);
                        const isCurrent = q === currentQuarter;
                        return (
                          <div
                            key={q}
                            className={cn(
                              "rounded-lg border bg-white p-3",
                              isCurrent && "border-primary ring-1 ring-primary/20"
                            )}
                          >
                            <p className="text-label-eyebrow text-[11px] font-semibold uppercase text-gray-500">
                              {q}
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {formatActual(goal, a)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              <ScorePill score={score} />
                              {a && (
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] capitalize text-gray-600">
                                  {a.status.replace("_", " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                  {(goal.status === "draft" || goal.status === "returned") && (
                    <>
                      <Link
                        href={`/goals/new?edit=${goal.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Goal
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGoal();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Goal
                      </Button>
                    </>
                  )}
                  {goal.status === "submitted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus("draft", "WITHDRAWN");
                      }}
                    >
                      Withdraw Submission
                    </Button>
                  )}
                  {(goal.status === "locked" || goal.status === "approved") && (
                    <Link
                      href={`/goals/${goal.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold text-primary hover:text-primary-hover"
                    >
                      View Full Details →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
