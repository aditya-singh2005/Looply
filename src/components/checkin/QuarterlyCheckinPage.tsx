"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import {
  Info,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/supabase/audit";
import { computeScore } from "@/lib/utils/score";
import { useRole } from "@/lib/hooks/useRole";
import { IDS } from "@/constants";

import { ScorePill } from "@/components/checkin/ScorePill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  Goal,
  GoalCycle,
  CheckinStatus,
  Quarter,
  UomType,
} from "@/types";

type GoalFormEntry = {
  actualValue: number | null | undefined;
  actualDate: string | null;
  status: CheckinStatus;
  score: number | null;
  isModified: boolean;
};

type CheckinComment = {
  id: string;
  goal_id: string;
  quarter: string;
  comment: string;
  created_at: string;
  users: { name: string } | null;
};

const QUARTER: Quarter = "Q2";

const STATUS_OPTIONS: { value: CheckinStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
];

const STATUS_PILL: Record<CheckinStatus, { bg: string; text: string; dot: string }> = {
  not_started: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  on_track: { bg: "bg-warning-bg", text: "text-warning", dot: "bg-warning" },
  completed: { bg: "bg-success-bg", text: "text-success", dot: "bg-success" },
};

function StatusBadge({ status }: { status: CheckinStatus }) {
  const s = STATUS_PILL[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {STATUS_OPTIONS.find((o) => o.value === status)?.label}
    </span>
  );
}

function SaveIndicator({ state, onRetry }: { state: "idle" | "saving" | "saved" | "error"; onRetry?: () => void }) {
  if (state === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-small-ui">
      {state === "saving" && (
        <>
          <RefreshCw className="h-3 w-3 animate-spin text-warning" />
          <span className="text-text-muted">Saving...</span>
        </>
      )}
      {state === "saved" && (
        <>
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-text-muted">Saved just now</span>
        </>
      )}
      {state === "error" && (
        <>
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span className="text-text-muted">Save failed</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-primary hover:underline text-small-ui">
              Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: CheckinStatus;
  onChange: (v: CheckinStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CheckinStatus)} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-full border-0 px-2 text-xs font-medium", STATUS_PILL[value].bg, STATUS_PILL[value].text)}>
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_PILL[value].dot)} />
          {STATUS_OPTIONS.find((o) => o.value === value)?.label}
        </div>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_PILL[opt.value].dot)} />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DatePickerCell({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        {value ? format(parseISO(value), "MMM d, yyyy") : "Select date"}
        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={selected}
          onSelect={(date) => {
            onChange(date.toISOString().split("T")[0]);
            setOpen(false);
          }}
        />
        {value && (
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function UomChip({ uomType }: { uomType: UomType }) {
  const icon = uomType === "timeline" ? "📅" : uomType === "zero" ? "0️⃣" : uomType === "numeric_max" ? "↓" : "↑";
  const label = uomType === "numeric_min" ? "Numeric" : uomType === "numeric_max" ? "Numeric" : uomType === "timeline" ? "Timeline" : "Zero";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function formatTarget(goal: Goal): { value: string; unit: string } {
  switch (goal.uom_type) {
    case "numeric_min":
    case "numeric_max":
      return { value: goal.target_value != null ? String(goal.target_value) : "—", unit: "" };
    case "timeline":
      return { value: goal.target_date ? format(parseISO(goal.target_date), "MMM d, yyyy") : "—", unit: "" };
    case "zero":
      return { value: "0", unit: "" };
    default:
      return { value: "—", unit: "" };
  }
}

function suggestStatus(score: number | null): CheckinStatus {
  if (score == null) return "not_started";
  if (score >= 80) return "completed";
  if (score >= 50) return "on_track";
  return "not_started";
}

export function QuarterlyCheckinPage() {
  const { user, role, mounted } = useRole();
  const supabase = useMemo(() => createClient(), []);

  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, CheckinComment>>({});
  const [loading, setLoading] = useState(true);

  const [goalStates, setGoalStates] = useState<Record<string, GoalFormEntry>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const lastSavePayload = useRef<Record<string, { actualValue: number | null | undefined; actualDate: string | null; status: CheckinStatus }>>({});

  const hasCycle = cycle !== null;

  const employeeId = mounted && role === "employee" ? user.id : IDS.users.emp1;

  const cycleQuarterStart = cycle ? cycle.q2_start : null;
  const cycleQuarterEnd = cycle ? cycle.q2_end : null;

  useEffect(() => {
    if (!mounted) return;
    async function load() {
      try {
        setLoading(true);
        const { data: cycleData } = await supabase
          .from("goal_cycles")
          .select("*")
          .eq("status", "active")
          .single();
        setCycle(cycleData as GoalCycle | null);

        if (cycleData) {
          const { data: goalsData } = await supabase
            .from("goals")
            .select("*, thrust_areas(name, color, bg_color), goal_achievements(id, quarter, actual_value, actual_date, status, submitted_at)")
            .eq("employee_id", employeeId)
            .eq("cycle_id", cycleData.id)
            .eq("status", "locked")
            .order("created_at", { ascending: true });
          const fetchedGoals = (goalsData ?? []) as Goal[];
          setGoals(fetchedGoals);

          const states: Record<string, GoalFormEntry> = {};
          for (const goal of fetchedGoals) {
            const existing = (goal.goal_achievements ?? []).find((a) => a.quarter === QUARTER);
            const actualValue = existing?.actual_value ?? null;
            const actualDate = existing?.actual_date ?? null;
            const status = existing?.status ?? "not_started";
            const score = computeScore(goal.uom_type, goal.target_value, goal.target_date, actualValue, actualDate);
            states[goal.id] = { actualValue, actualDate, status, score, isModified: false };
          }
          setGoalStates(states);

          const goalIds = fetchedGoals.map((g) => g.id);
          if (goalIds.length > 0) {
            const { data: commentsData } = await supabase
              .from("checkin_comments")
              .select("*, users(name)")
              .eq("quarter", QUARTER)
              .in("goal_id", goalIds);
            const cmap: Record<string, CheckinComment> = {};
            for (const c of (commentsData ?? []) as CheckinComment[]) {
              cmap[c.goal_id] = c;
            }
            setCommentsMap(cmap);
          }
        }
      } catch (e) {
        toast.error("Failed to load check-in data", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mounted, employeeId, supabase]);

  const updateGoalState = useCallback((goalId: string, update: Partial<GoalFormEntry>) => {
    setGoalStates((prev) => {
      const existing = prev[goalId];
      if (!existing) return prev;
      return { ...prev, [goalId]: { ...existing, ...update, isModified: true } };
    });
  }, []);

  const computeAndSetScore = useCallback(
    (goalId: string, actualValue: number | null | undefined, actualDate: string | null) => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;
      const score = computeScore(goal.uom_type, goal.target_value, goal.target_date, actualValue ?? null, actualDate);
      const suggested = suggestStatus(score);
      updateGoalState(goalId, { actualValue, actualDate, score, status: suggested });
    },
    [goals, updateGoalState]
  );

  const debouncedSave = useDebouncedCallback(
    async (goalId: string, data: { actualValue: number | null | undefined; actualDate: string | null; status: CheckinStatus }) => {
      setSaveState("saving");
      try {
        const payload: Record<string, unknown> = {
          goal_id: goalId,
          quarter: QUARTER,
          actual_value: data.actualValue ?? null,
          actual_date: data.actualDate ?? null,
          status: data.status,
        };
        const { error } = await supabase.from("goal_achievements").upsert(payload, {
          onConflict: "goal_id,quarter",
        });
        if (error) throw error;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    2000
  );

  const handleActualValueChange = useCallback(
    (goalId: string, value: number | null | undefined) => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;
      const goalState = goalStates[goalId];
      const actualDate = goal.uom_type === "timeline" ? goalState?.actualDate ?? null : null;
      computeAndSetScore(goalId, value, actualDate);
      const status = suggestStatus(
        computeScore(goal.uom_type, goal.target_value, goal.target_date, value ?? null, actualDate)
      );
      lastSavePayload.current[goalId] = { actualValue: value, actualDate, status };
      debouncedSave(goalId, { actualValue: value, actualDate, status });
    },
    [goals, goalStates, computeAndSetScore, debouncedSave]
  );

  const handleActualDateChange = useCallback(
    (goalId: string, date: string | null) => {
      const goalState = goalStates[goalId];
      const actualValue = goalState?.actualValue ?? null;
      computeAndSetScore(goalId, actualValue, date);
      const status = suggestStatus(
        computeScore(
          goals.find((g) => g.id === goalId)?.uom_type ?? "numeric_min",
          goals.find((g) => g.id === goalId)?.target_value ?? null,
          goals.find((g) => g.id === goalId)?.target_date ?? null,
          actualValue,
          date
        )
      );
      lastSavePayload.current[goalId] = { actualValue, actualDate: date, status };
      debouncedSave(goalId, { actualValue, actualDate: date, status });
    },
    [goalStates, goals, computeAndSetScore, debouncedSave]
  );

  const handleStatusChange = useCallback(
    (goalId: string, status: CheckinStatus) => {
      updateGoalState(goalId, { status });
      const existing = goalStates[goalId];
      lastSavePayload.current[goalId] = {
        actualValue: existing?.actualValue ?? null,
        actualDate: existing?.actualDate ?? null,
        status,
      };
      debouncedSave(goalId, {
        actualValue: existing?.actualValue ?? null,
        actualDate: existing?.actualDate ?? null,
        status,
      });
    },
    [goalStates, updateGoalState, debouncedSave]
  );

  const manualSaveAll = useCallback(async () => {
    const entries = Object.entries(lastSavePayload.current);
    if (!entries.length) return;
    setSaveState("saving");
    try {
      for (const [goalId, data] of entries) {
        const payload: Record<string, unknown> = {
          goal_id: goalId,
          quarter: QUARTER,
          actual_value: data.actualValue ?? null,
          actual_date: data.actualDate ?? null,
          status: data.status,
        };
        const { error } = await supabase.from("goal_achievements").upsert(payload, {
          onConflict: "goal_id,quarter",
        });
        if (error) throw error;
      }
      lastSavePayload.current = {};
      setSaveState("saved");
      toast.success("All changes saved");
    } catch {
      setSaveState("error");
      toast.error("Failed to save changes");
    }
  }, [supabase]);

  const updatedCount = useMemo(
    () => goals.filter((g) => goalStates[g.id]?.actualValue != null || goalStates[g.id]?.actualDate != null).length,
    [goals, goalStates]
  );

  const completedCount = useMemo(
    () => goals.filter((g) => goalStates[g.id]?.status === "completed").length,
    [goals, goalStates]
  );

  const onTrackCount = useMemo(
    () => goals.filter((g) => goalStates[g.id]?.status === "on_track").length,
    [goals, goalStates]
  );

  const notStartedCount = useMemo(
    () => goals.filter((g) => {
      const s = goalStates[g.id];
      return !s || (s.status === "not_started" && s.actualValue == null && s.actualDate == null);
    }).length,
    [goals, goalStates]
  );

  const weightedScore = useMemo(() => {
    let sum = 0;
    let totalWeight = 0;
    for (const goal of goals) {
      const state = goalStates[goal.id];
      const score = state?.score ?? null;
      if (score != null) {
        sum += score * Number(goal.weightage);
        totalWeight += Number(goal.weightage);
      }
    }
    return totalWeight > 0 ? sum / totalWeight : 0;
  }, [goals, goalStates]);

  const allFilled = useMemo(
    () => goals.length > 0 && goals.every((g) => {
      const s = goalStates[g.id];
      if (!s) return false;
      if (g.uom_type === "timeline") return s.actualDate != null;
      return s.actualValue != null && s.actualValue !== undefined;
    }),
    [goals, goalStates]
  );

  const handleSubmit = useCallback(async () => {
    if (!allFilled) return;
    try {
      for (const goal of goals) {
        const state = goalStates[goal.id];
        if (!state) continue;
        const payload: Record<string, unknown> = {
          goal_id: goal.id,
          quarter: QUARTER,
          actual_value: state.actualValue ?? null,
          actual_date: state.actualDate ?? null,
          status: state.status,
          submitted_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("goal_achievements").upsert(payload, {
          onConflict: "goal_id,quarter",
        });
        if (error) throw error;
      }
      await logAudit({
        userId: employeeId,
        action: "CHECKIN_SUBMITTED",
        entityType: "checkin",
        newValue: { quarter: QUARTER },
      });
      setSubmitted(true);
      setSubmittedAt(new Date().toISOString());
      setSubmitDialogOpen(false);
      toast.success(`Q2 Check-in submitted successfully! Priya Sharma has been notified.`);
    } catch (e) {
      toast.error("Failed to submit check-in", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }, [allFilled, goals, goalStates, supabase, employeeId]);

  const handleRetry = useCallback(() => {
    if (Object.keys(lastSavePayload.current).length > 0) {
      manualSaveAll();
    }
  }, [manualSaveAll]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-6 w-96 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-24 animate-pulse rounded-card bg-gray-100" />
        <div className="h-16 animate-pulse rounded-card bg-white" />
        <div className="h-[400px] animate-pulse rounded-card bg-white" />
      </div>
    );
  }

  if (!hasCycle) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="max-w-sm text-center">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="mb-2 text-page-title text-text-primary">No Active Check-in Window</h2>
          <p className="mb-6 text-sm text-text-secondary">
            The next check-in window opens in January 2026 for Q3.
          </p>
          <Button variant="outline" onClick={() => {}}>
            View Previous Submissions
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const formattedDate = submittedAt ? format(parseISO(submittedAt), "MMM d, yyyy 'at' h:mm a") : "";
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-text-primary">{QUARTER} Check-in</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle className="h-3 w-3" />
              Submitted
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-card border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{QUARTER} Check-in submitted on {formattedDate}</span>
        </div>

        <div className="rounded-card border border-border bg-white shadow-card">
          <div className="border-b border-border-subtle px-5 py-4">
            <h2 className="text-section-header font-semibold text-text-primary">
              Goal Achievement Update — {QUARTER} 2025
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["Goal", "UoM", "Target", "Actual", "Status", "Score"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const state = goalStates[goal.id];
                  const target = formatTarget(goal);
                  return (
                    <tr key={goal.id} className="h-14 border-b border-border-subtle transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          {goal.thrust_areas && (
                            <div className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: goal.thrust_areas.color }} />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{goal.title}</p>
                            {goal.thrust_areas && (
                              <p className="text-xs text-text-muted">{goal.thrust_areas.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2"><UomChip uomType={goal.uom_type} /></td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">{target.value}</td>
                      <td className="px-4 py-2 text-sm">
                        {goal.uom_type === "timeline"
                          ? (state?.actualDate ? format(parseISO(state.actualDate), "MMM d, yyyy") : "—")
                          : (state?.actualValue != null ? String(state.actualValue) : "—")}
                      </td>
                      <td className="px-4 py-2">{state && <StatusBadge status={state.status} />}</td>
                      <td className="px-4 py-2"><ScorePill score={state?.score ?? null} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-text-primary">{QUARTER} Check-in</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Open
            </span>
            {cycleQuarterStart && cycleQuarterEnd && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-text-muted">
                {format(parseISO(cycleQuarterStart), "MMM d")} — {format(parseISO(cycleQuarterEnd), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">Update your actual achievement for each goal. Your manager Priya Sharma will review after submission.</p>
        </div>
        <SaveIndicator state={saveState} onRetry={handleRetry} />
      </div>

      <div className="flex items-start gap-3 rounded-card border-l-4 border-l-info bg-info-bg p-4 text-sm text-text-primary">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>Score is calculated automatically based on your unit of measurement type. You only need to enter your actual achievement.</p>
      </div>

      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <div className="flex items-center divide-x divide-border">
          <div className="flex flex-col items-center px-6 first:pl-0">
            <span className="text-label-eyebrow text-xs font-semibold uppercase text-text-muted">Updated</span>
            <span className="mt-0.5 text-lg font-bold text-primary">{updatedCount} of {goals.length}</span>
          </div>
          <div className="flex flex-col items-center px-6">
            <span className="text-label-eyebrow text-xs font-semibold uppercase text-text-muted">Completed</span>
            <span className="mt-0.5 text-lg font-bold text-success">{completedCount}</span>
          </div>
          <div className="flex flex-col items-center px-6">
            <span className="text-label-eyebrow text-xs font-semibold uppercase text-text-muted">On Track</span>
            <span className="mt-0.5 text-lg font-bold text-warning">{onTrackCount}</span>
          </div>
          <div className="flex flex-col items-center px-6">
            <span className="text-label-eyebrow text-xs font-semibold uppercase text-text-muted">Not Started</span>
            <span className="mt-0.5 text-lg font-bold text-danger">{notStartedCount}</span>
          </div>
          <div className="flex flex-col items-center px-6">
            <span className="text-label-eyebrow text-xs font-semibold uppercase text-text-muted">Weighted Score</span>
            <span
              className={cn(
                "mt-0.5 text-xl font-bold",
                weightedScore >= 80 ? "text-success" : weightedScore >= 50 ? "text-warning" : "text-danger"
              )}
            >
              {Math.round(weightedScore)}%
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-white shadow-card">
        <div className="border-b border-border-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            Goal Achievement Update — {QUARTER} 2025
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th style={{ width: "28%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Goal</th>
                <th style={{ width: "9%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">UoM</th>
                <th style={{ width: "10%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Target</th>
                <th style={{ width: "15%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Actual</th>
                <th style={{ width: "12%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Status</th>
                <th style={{ width: "10%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Score</th>
                <th style={{ width: "16%" }} className="px-4 py-2.5 text-label-eyebrow text-xs font-semibold uppercase tracking-wider text-text-muted">Manager Note</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const state = goalStates[goal.id];
                const target = formatTarget(goal);
                const comment = commentsMap[goal.id];
                const rowBg =
                  state?.status === "completed"
                    ? "bg-success-bg/30"
                    : state?.status === "on_track"
                      ? "bg-warning-bg/20"
                      : "";

                return (
                  <tr
                    key={goal.id}
                    className={cn(
                      "h-16 border-b border-border-subtle transition-colors duration-300",
                      rowBg
                    )}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {goal.thrust_areas && (
                          <div
                            className="h-10 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: goal.thrust_areas.color }}
                          />
                        )}
                        <div className="min-w-0 max-w-[200px]">
                          <p className="truncate text-sm font-semibold text-text-primary">{goal.title}</p>
                          {goal.thrust_areas && (
                            <p className="text-xs text-text-muted">{goal.thrust_areas.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <UomChip uomType={goal.uom_type} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <p className="text-sm font-semibold text-gray-700">{target.value}</p>
                    </td>
                    <td className="px-4 py-2">
                      {goal.uom_type === "timeline" ? (
                        <DatePickerCell
                          value={state?.actualDate ?? null}
                          onChange={(d) => handleActualDateChange(goal.id, d)}
                        />
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          placeholder={goal.uom_type === "zero" ? "Enter 0 for success" : "Enter actual"}
                          value={state?.actualValue ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            handleActualValueChange(goal.id, v);
                          }}
                          className="h-10 w-full rounded-lg border-gray-200 focus-visible:border-indigo-400 focus-visible:ring-indigo-200"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <StatusSelect
                        value={state?.status ?? "not_started"}
                        onChange={(v) => handleStatusChange(goal.id, v)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <ScorePill score={state?.score ?? null} />
                    </td>
                    <td className="px-4 py-2">
                      {comment ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="cursor-default">
                                <p className="max-w-[180px] truncate text-xs italic text-text-muted leading-relaxed line-clamp-2">
                                  {comment.comment}
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-400">— {comment.users?.name ?? "Manager"}</p>
                              </div>
                            }
                          />
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs">{comment.comment}</p>
                            <p className="mt-1 text-[11px] text-gray-400">— {comment.users?.name ?? "Manager"}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border-subtle bg-gray-50 px-5 py-3">
          <p className="text-sm text-text-muted">Showing {goals.length} goals for {QUARTER} 2025</p>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-text-muted font-normal">Weighted Average Score:</span>
            <ScorePill score={Math.round(weightedScore)} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white px-4 py-3 shadow-elevated md:left-16 lg:left-[240px]">
        <div className="mx-auto flex max-w-content items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              Progress: {updatedCount} of {goals.length} goals updated
            </span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${goals.length > 0 ? (updatedCount / goals.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={manualSaveAll}
              disabled={saveState === "saving"}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              Save Progress
            </Button>
            <Tooltip>
              <TooltipTrigger
                disabled={allFilled}
                render={
                  <span tabIndex={0}>
                    <Button
                      size="sm"
                      className="bg-primary text-white hover:bg-primary-hover"
                      disabled={!allFilled}
                      onClick={() => setSubmitDialogOpen(true)}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Submit Check-in
                    </Button>
                  </span>
                }
              />
              {!allFilled && (
                <TooltipContent>
                  <p>Please update all goals before submitting</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Submit {QUARTER} Check-in?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-label-eyebrow text-xs font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2">Goal</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => {
                    const state = goalStates[goal.id];
                    return (
                      <tr key={goal.id} className="border-t border-border-subtle">
                        <td className="max-w-[200px] truncate px-3 py-2 text-sm font-medium text-text-primary">
                          {goal.title}
                        </td>
                        <td className="px-3 py-2">
                          <ScorePill score={state?.score ?? null} />
                        </td>
                        <td className="px-3 py-2">
                          {state && <StatusBadge status={state.status} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
              <span className="text-sm font-medium text-text-primary">Weighted Average</span>
              <ScorePill score={Math.round(weightedScore)} />
            </div>

            {weightedScore < 50 && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>Some goals are below 50% achievement. Your manager will be notified.</p>
              </div>
            )}

            <p className="text-xs text-text-muted">
              Once submitted, your check-in will be sent to Priya Sharma for review. You cannot edit after submission.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary text-white hover:bg-primary-hover" onClick={handleSubmit}>
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
