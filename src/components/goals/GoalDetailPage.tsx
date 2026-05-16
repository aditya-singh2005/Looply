"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AuditLog, Goal } from "@/types";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { ThrustAreaBadge } from "@/components/shared/ThrustAreaBadge";
import { ScorePill } from "@/components/checkin/ScorePill";
import { formatTarget, UOM_LABELS, formatActual, getAchievementScore } from "@/lib/utils/goal-format";
import { Skeleton } from "@/components/ui/skeleton";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

function describeAudit(entry: AuditLog): string {
  const name = entry.users?.name ?? "System";
  const action = entry.action;
  if (action === "APPROVED") return `${name} approved this goal`;
  if (action === "SUBMITTED") return `You submitted this goal`;
  if (action === "TARGET_MODIFIED") {
    const oldV = entry.old_value?.target_value;
    const newV = entry.new_value?.target_value;
    return `${name} modified target: ${oldV} → ${newV}`;
  }
  if (action === "WITHDRAWN") return `You withdrew submission`;
  return `${name} — ${action}`;
}

export function GoalDetailPage({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: g, error: ge } = await supabase
          .from("goals")
          .select(
            `*, thrust_areas(id, name, color, bg_color), goal_achievements(*)`
          )
          .eq("id", goalId)
          .single();
        if (ge) throw ge;

        const { data: logs, error: le } = await supabase
          .from("audit_logs")
          .select(`*, users(name, email)`)
          .eq("goal_id", goalId)
          .order("created_at", { ascending: false });
        if (le) throw le;

        setGoal(g as Goal);
        setAudit((logs ?? []) as AuditLog[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load goal");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [goalId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-64 lg:col-span-3" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Goal not found.</p>
        <Link href="/goals" className="mt-4 text-primary hover:underline">
          Back to My Goals
        </Link>
      </div>
    );
  }

  const meta = [
    ["Unit of Measure", UOM_LABELS[goal.uom_type]],
    ["Target", formatTarget(goal)],
    ["Weightage", `${goal.weightage}%`],
    ["Created", format(parseISO(goal.created_at), "MMM d, yyyy")],
    ["Last Updated", format(parseISO(goal.updated_at), "MMM d, yyyy")],
    ...(goal.locked_at
      ? [["Approved / Locked", format(parseISO(goal.locked_at), "MMM d, yyyy")]]
      : []),
  ] as const;

  return (
    <div className="space-y-6">
      <Link
        href="/goals"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Goals
      </Link>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-card border border-border bg-white p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {goal.thrust_areas && <ThrustAreaBadge area={goal.thrust_areas} />}
              <GoalStatusBadge status={goal.status} showLock={goal.status === "locked"} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{goal.title}</h1>
            <p className="mt-3 text-sm text-gray-500">
              {goal.description || "No description provided."}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              {meta.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-card border border-border bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900">Achievement History</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                    {["Quarter", "Target", "Actual", "Score", "Status", "Updated"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {QUARTERS.map((q) => {
                    const a = goal.goal_achievements?.find((x) => x.quarter === q);
                    return (
                      <tr key={q} className="border-b border-gray-50">
                        <td className="px-3 py-3 font-medium">{q}</td>
                        <td className="px-3 py-3">{formatTarget(goal)}</td>
                        <td className="px-3 py-3">{formatActual(goal, a)}</td>
                        <td className="px-3 py-3">
                          <ScorePill score={getAchievementScore(goal, a)} />
                        </td>
                        <td className="px-3 py-3 capitalize text-gray-600">
                          {a?.status?.replace("_", " ") ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-500">
                          {a?.submitted_at
                            ? format(parseISO(a.submitted_at), "MMM d, yyyy")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-card border border-border bg-white p-6 shadow-card">
            <div className="mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Change History</h2>
            </div>
            {audit.length === 0 ? (
              <p className="text-sm text-gray-500">No audit entries yet.</p>
            ) : (
              <ul className="space-y-4">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-gray-900">{describeAudit(entry)}</p>
                      <p className="font-mono text-xs text-gray-400">
                        {format(parseISO(entry.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
