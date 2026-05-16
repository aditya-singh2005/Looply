"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IDS } from "@/constants";
import type { Goal } from "@/types";
import { toast } from "sonner";

export function useGoals(employeeId: string | null, cycleId: string = IDS.cycle) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

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

  return { goals, loading, refetch: fetchGoals, setGoals };
}
