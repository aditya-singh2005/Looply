"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IDS } from "@/constants";
import type { Goal } from "@/types";
import { toast } from "sonner";

export function useGoals(employeeId: string | null, cycleId: string = IDS.cycle) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Track current goals by id so we can compare old vs new status in realtime events
  const goalsRef = useRef<Goal[]>([]);
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  const fetchGoals = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("goals")
        .select(
          `
          *,
          thrust_areas(id, name, color, bg_color),
          goal_achievements(quarter, actual_value, actual_date, status, score, submitted_at)
        `
        )
        .eq("employee_id", employeeId)
        .eq("cycle_id", cycleId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setGoals((data ?? []) as Goal[]);
    } catch (e) {
      toast.error("Failed to load goals", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, cycleId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ── Realtime subscription with smart notifications ─────────────────────────
  useEffect(() => {
    if (!employeeId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`goals:employee:${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "goals",
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload) => {
          const oldStatus = payload.old?.status as string | undefined;
          const newStatus = payload.new?.status as string | undefined;
          const goalTitle = (payload.new?.title as string) ?? "Your goal";

          // Only show notification when status actually changed
          if (oldStatus && newStatus && oldStatus !== newStatus) {
            if (newStatus === "approved") {
              toast.success(`✅ Goal Approved!`, {
                description: `"${goalTitle}" has been approved by your manager.`,
                duration: 6000,
              });
            } else if (newStatus === "returned") {
              toast.warning(`↩️ Goal Returned for Revision`, {
                description: `"${goalTitle}" was returned. Check your manager's comment and resubmit.`,
                duration: 8000,
              });
            } else if (newStatus === "locked") {
              toast.info(`🔒 Goal Locked`, {
                description: `"${goalTitle}" has been locked for this cycle.`,
                duration: 5000,
              });
            }
          }

          // Always re-fetch to sync UI
          fetchGoals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "goals",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchGoals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "goals",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchGoals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_achievements",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, fetchGoals]);

  return { goals, loading, refetch: fetchGoals, setGoals };
}
