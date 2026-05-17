"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Shield,
  Check,
  ArrowLeft,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/supabase/audit";
import { useRole } from "@/lib/hooks/useRole";
import { useGoals } from "@/lib/hooks/useGoals";
import { validateWeightage } from "@/lib/utils/weightage";
import { IDS, MAX_GOALS, MIN_WEIGHTAGE } from "@/constants";
import type { GoalCycle, ThrustArea, UomType } from "@/types";
import { WeightageBar } from "./WeightageBar";
import { UOM_LABELS } from "@/lib/utils/goal-format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  thrust_area_id: z.string().min(1, "Select a thrust area"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(300).optional(),
  uom_type: z.enum(["numeric_min", "numeric_max", "timeline", "zero"]),
  target_value: z.number().optional().nullable(),
  target_date: z.string().optional().nullable(),
  weightage: z.number().min(MIN_WEIGHTAGE).max(100),
});

type FormValues = z.infer<typeof schema>;

const UOM_OPTIONS: {
  id: UomType;
  title: string;
  desc: string;
  icon: typeof TrendingUp;
}[] = [
  { id: "numeric_min", title: "Numeric Min", desc: "Higher is better", icon: TrendingUp },
  { id: "numeric_max", title: "Numeric Max", desc: "Lower is better", icon: TrendingDown },
  { id: "timeline", title: "Timeline", desc: "Date-based completion", icon: Calendar },
  { id: "zero", title: "Zero", desc: "Zero = 100% success", icon: Shield },
];

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

export function GoalWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, mounted } = useRole();
  const { goals, refetch } = useGoals(user?.id);
  const [step, setStep] = useState(1);
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [cycleLoading, setCycleLoading] = useState(true);

  // FIX 3: Fetch active cycle and check window
  useEffect(() => {
    createClient()
      .from("goal_cycles")
      .select("*")
      .eq("is_active", true)
      .maybeSingle()
      .then(
        ({ data }) => {
          setCycle(data as GoalCycle | null);
          setCycleLoading(false);
        },
        () => setCycleLoading(false)
      );
  }, []);

  const existingForWeight = goals.filter((g) => g.id !== editId && g.status !== "draft");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      thrust_area_id: "",
      title: "",
      description: "",
      uom_type: "numeric_min",
      target_value: null,
      target_date: null,
      weightage: 25,
    },
  });

  const watched = form.watch();
  const weightCheck = validateWeightage(
    existingForWeight.map((g) => ({ id: g.id, weightage: Number(g.weightage) })),
    editId,
    watched.weightage ?? 0
  );

  useEffect(() => {
    createClient()
      .from("thrust_areas")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setThrustAreas((data ?? []) as ThrustArea[]);
      });
  }, []);

  useEffect(() => {
    if (!editId) return;
    createClient()
      .from("goals")
      .select("*")
      .eq("id", editId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        form.reset({
          thrust_area_id: data.thrust_area_id ?? "",
          title: data.title,
          description: data.description ?? "",
          uom_type: data.uom_type,
          target_value: data.target_value,
          target_date: data.target_date,
          weightage: Number(data.weightage),
        });
      });
  }, [editId, form]);

  const step1Valid =
    watched.thrust_area_id && watched.title && watched.title.length >= 3;

  const step2Valid = useMemo(() => {
    if (!watched.uom_type) return false;
    if (watched.uom_type === "zero") return weightCheck.valid;
    if (watched.uom_type === "timeline") return !!watched.target_date && weightCheck.valid;
    return watched.target_value != null && !Number.isNaN(watched.target_value) && weightCheck.valid;
  }, [watched, weightCheck.valid]);

  const totalAfter = weightCheck.total;
  const canSubmit = step2Valid && weightCheck.valid;
  // FIX 1: only allow "submitted" status if total === 100
  const canSubmitToApproval = canSubmit && totalAfter === 100;

  async function saveGoal(status: "draft" | "submitted") {
    if (goals.length >= MAX_GOALS && !editId) {
      toast.error("Maximum 8 goals reached for this cycle");
      return;
    }
    if (!weightCheck.valid) {
      toast.error(weightCheck.error ?? "Invalid weightage");
      return;
    }

    const values = form.getValues();
    if (!user) {
      toast.error("User profile not loaded. Please try again.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const payload = {
        employee_id: user.id,
        cycle_id: IDS.cycle,
        thrust_area_id: values.thrust_area_id,
        title: values.title,
        description: values.description || null,
        uom_type: values.uom_type,
        target_value: values.uom_type === "timeline" || values.uom_type === "zero" ? values.target_value ?? 0 : values.target_value,
        target_date: values.uom_type === "timeline" ? (values.target_date || null) : null,
        weightage: values.weightage,
        status,
      };

      if (editId) {
        const { error } = await supabase.from("goals").update(payload).eq("id", editId);
        if (error) throw error;
        await logAudit({
          userId: user.id,
          goalId: editId,
          action: status === "submitted" ? "SUBMITTED" : "UPDATED",
          entityType: "goal",
          newValue: { status },
        });
      } else {
        const { data, error } = await supabase.from("goals").insert(payload).select("id").single();
        if (error) throw error;
        await logAudit({
          userId: user.id,
          goalId: data.id,
          action: status === "submitted" ? "SUBMITTED" : "CREATED",
          entityType: "goal",
          newValue: { status, title: values.title },
        });
      }

      if (status === "submitted" && user.manager_id) {
        await supabase.from("notifications").insert({
          user_id: user.manager_id,
          title: "Goal Submitted for Approval",
          body: `${user.name} has submitted the goal "${values.title}" for approval.`,
          is_read: false
        });
      }

      toast.success(
        status === "submitted" ? "Goal submitted for approval" : "Goal saved as draft"
      );
      await refetch();
      router.push("/goals");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSubmitting(false);
    }
  }

  // FIX 1: Click handler for Submit for Approval — saves as draft if total < 100
  async function handleSubmitClick() {
    if (totalAfter === 100) {
      await saveGoal("submitted");
    } else {
      await saveGoal("draft");
      toast.info(
        "Saved as draft. Add more goals until total reaches 100% to submit for approval.",
        { duration: 5000 }
      );
    }
  }

  const selectedThrust = thrustAreas.find((t) => t.id === watched.thrust_area_id);

  // FIX 3: Show full-page notice if window is closed
  if (!cycleLoading) {
    const windowStatus = isWindowOpen(cycle);
    if (!windowStatus.open) {
      return (
        <div className="mx-auto max-w-[720px] space-y-8 pb-12">
          <Link href="/goals" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to My Goals
          </Link>
          <div className="rounded-card border border-amber-200 bg-amber-50 p-10 text-center shadow-card">
            <Lock className="mx-auto mb-4 h-12 w-12 text-amber-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-900">Goal Setting Window Closed</h2>
            <p className="mb-6 text-sm text-amber-700">{windowStatus.reason}</p>
            <Link
              href="/goals"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Goals
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-8 pb-12">
      <Link href="/goals" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to My Goals
      </Link>

      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                step > s
                  ? "bg-success text-white"
                  : step === s
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className="h-0.5 w-12 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-white p-6 shadow-card md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Goal Details</h2>
            <div className="space-y-2">
              <Label>Thrust Area</Label>
              <select
                {...form.register("thrust_area_id")}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled hidden>Select thrust area</option>
                {thrustAreas.map((ta) => (
                  <option key={ta.id} value={ta.id}>
                    {ta.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input {...form.register("title")} maxLength={100} />
              <p className="text-xs text-gray-400">{watched.title?.length ?? 0}/100</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register("description")} maxLength={300} rows={4} />
              <p className="text-xs text-gray-400">{(watched.description ?? "").length}/300</p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="bg-primary text-white"
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Measurement & Weightage</h2>
            <div className="grid grid-cols-2 gap-3">
              {UOM_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = watched.uom_type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => form.setValue("uom_type", opt.id)}
                    className={cn(
                      "flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
                      selected
                        ? "border-primary bg-primary-subtle"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-semibold">{opt.title}</span>
                    <span className="text-xs text-gray-500">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {watched.uom_type === "zero" ? (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                Zero incidents or defects = 100% achievement. No target input required.
              </p>
            ) : watched.uom_type === "timeline" ? (
              <div className="space-y-2">
                <Label>Target completion date</Label>
                <Input type="date" {...form.register("target_date")} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Target value</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    {...form.register("target_value", { valueAsNumber: true })}
                  />
                  <span className="flex items-center text-sm text-gray-500">
                    {watched.uom_type === "numeric_min" ? "units" : "max units"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-6">
              <p className="text-center text-5xl font-bold text-primary">
                {watched.weightage}%
              </p>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={watched.weightage}
                onChange={(e) => form.setValue("weightage", Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-center text-sm text-gray-500">
                Remaining allocatable: {weightCheck.remaining}% · Total if saved: {totalAfter}%
              </p>
              {weightCheck.error && (
                <p className="text-center text-sm text-danger">{weightCheck.error}</p>
              )}
              <WeightageBar
                goals={existingForWeight}
                pendingWeightage={watched.weightage}
                pendingLabel={watched.title || "This goal"}
                pendingColor={selectedThrust?.color}
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="bg-primary text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
              <p>
                <span className="text-gray-500">Thrust:</span>{" "}
                {selectedThrust?.name}
              </p>
              <p>
                <span className="text-gray-500">Title:</span> {watched.title}
              </p>
              <p>
                <span className="text-gray-500">UoM:</span> {UOM_LABELS[watched.uom_type]}
              </p>
              <p>
                <span className="text-gray-500">Target:</span>{" "}
                {watched.uom_type === "timeline"
                  ? watched.target_date
                  : watched.target_value}
              </p>
              <p>
                <span className="text-gray-500">Weightage:</span> {watched.weightage}%
              </p>
            </div>

            {/* FIX 1: Info banners about 100% requirement */}
            {totalAfter < 100 && (
              <p className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
                ⚠️ Your goals will total {totalAfter}% after saving. Clicking &quot;Submit for Approval&quot; will save as draft until total reaches 100%.
              </p>
            )}
            {totalAfter > 100 && (
              <p className="rounded-lg border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
                ❌ Total weightage exceeds 100% ({totalAfter}%). Reduce this goal&apos;s weightage before submitting.
              </p>
            )}
            {totalAfter === 100 && (
              <p className="rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
                ✅ Total weightage is exactly 100%. This goal can be submitted directly for approval.
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting || !canSubmit}
                  onClick={() => saveGoal("draft")}
                >
                  Save as Draft
                </Button>
                {/* FIX 1: Button text changes based on whether total = 100 */}
                <Button
                  type="button"
                  disabled={submitting || !canSubmit}
                  onClick={handleSubmitClick}
                  className={cn(
                    "text-white",
                    canSubmitToApproval ? "bg-primary" : "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  {canSubmitToApproval ? "Submit for Approval" : "Save as Draft (100% required)"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
