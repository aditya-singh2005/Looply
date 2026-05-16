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
import type { ThrustArea, UomType } from "@/types";
import { WeightageBar } from "./WeightageBar";
import { UOM_LABELS } from "@/lib/utils/goal-format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function GoalWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user } = useRole();
  const { goals, refetch } = useGoals(user.id);
  const [step, setStep] = useState(1);
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
  const canSubmit = step2Valid && totalAfter <= 100;

  async function saveGoal(status: "draft" | "submitted") {
    if (goals.length >= MAX_GOALS && !editId) {
      toast.error("Maximum 8 goals reached for this cycle");
      return;
    }
    if (status === "submitted" && totalAfter !== 100) {
      toast.error("Total weightage must equal 100% before submitting");
      return;
    }
    if (!weightCheck.valid) {
      toast.error(weightCheck.error ?? "Invalid weightage");
      return;
    }

    const values = form.getValues();
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
        target_date: values.uom_type === "timeline" ? values.target_date : null,
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

  const selectedThrust = thrustAreas.find((t) => t.id === watched.thrust_area_id);

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
              <Select
                value={watched.thrust_area_id}
                onValueChange={(v) => form.setValue("thrust_area_id", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select thrust area" />
                </SelectTrigger>
                <SelectContent>
                  {thrustAreas.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {totalAfter !== 100 && (
              <p className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
                Total weightage is {totalAfter}% (recommended 100% before final cycle submit).
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
                <Button
                  type="button"
                  disabled={submitting || !canSubmit || totalAfter > 100}
                  onClick={() => saveGoal("submitted")}
                  className="bg-primary text-white"
                >
                  Submit for Approval
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
