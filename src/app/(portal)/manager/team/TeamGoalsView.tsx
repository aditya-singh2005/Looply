"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRole } from "@/lib/hooks/useRole";
import { logAudit } from "@/lib/supabase/audit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThrustAreaRow = {
  id: string;
  name: string;
  color: string;
  bg_color: string;
};

type GoalRow = {
  id: string;
  title: string;
  description?: string;
  status: string;
  uom_type: string;
  target_value: number;
  target_date?: string;
  weightage: number;
  employee_id: string;
  thrust_areas: ThrustAreaRow | null;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatar_initials?: string;
  profile_pic?: string;
  role: string;
  departments: { name: string } | null;
  goals: GoalRow[];
};

type FlatRow = {
  employee: TeamMember;
  goal: GoalRow;
  alignment: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusMeta(status: string) {
  switch (status) {
    case "approved":
    case "locked":
      return { label: "On Track", dotColor: "#22c55e", textColor: "text-green-600" };
    case "submitted":
      return { label: "Submitted", dotColor: "#6366f1", textColor: "text-indigo-600" };
    case "returned":
      return { label: "Needs Revision", dotColor: "#ef4444", textColor: "text-red-500" };
    case "draft":
      return { label: "Draft", dotColor: "#9ca3af", textColor: "text-gray-400" };
    default:
      return { label: status, dotColor: "#9ca3af", textColor: "text-gray-400" };
  }
}

function AlignmentRing({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct >= 90 ? "#4f46e5" : pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="48"
        y="48"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="700"
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}

const PAGE_SIZE = 8;

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TeamGoalsView() {
  const { user: currentUser, mounted } = useRole();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [thrustFilter, setThrustFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Actions state
  const [returningGoalId, setReturningGoalId] = useState<string | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // FIX 6: Inline edit state for target/weightage before approval
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string>("");
  const [editWeightage, setEditWeightage] = useState<string>("");

  // FIX 8: Confirmation dialog for piecemeal approval
  const [confirmGoalId, setConfirmGoalId] = useState<string | null>(null);
  const [confirmEmployeeTotal, setConfirmEmployeeTotal] = useState<number>(0);

  // FIX 6: Approve with optional inline edits
  const handleApprove = async (goalId: string, employeeTotalWeight: number) => {
    if (actionLoading) return;
    // FIX 8: If total != 100, require confirmation
    if (employeeTotalWeight !== 100) {
      setConfirmGoalId(goalId);
      setConfirmEmployeeTotal(employeeTotalWeight);
      return;
    }
    await doApprove(goalId);
  };

  const doApprove = async (goalId: string) => {
    if (actionLoading || !currentUser?.id) return;
    setActionLoading(true);
    setConfirmGoalId(null);
    try {
      // FIX 6: Apply inline edits if any before approving
      if (editingGoalId === goalId) {
        const updates: Record<string, unknown> = {};
        const parsedTarget = parseFloat(editTarget);
        const parsedWeight = parseFloat(editWeightage);
        if (!isNaN(parsedTarget)) updates.target_value = parsedTarget;
        if (!isNaN(parsedWeight) && parsedWeight >= 10 && parsedWeight <= 100) updates.weightage = parsedWeight;

        if (Object.keys(updates).length > 0) {
          const { error: updateErr } = await createClient().from("goals").update(updates).eq("id", goalId);
          if (updateErr) throw updateErr;
          await logAudit({
            userId: currentUser.id,
            goalId,
            action: "MODIFIED",
            entityType: "goal",
            oldValue: {},
            newValue: updates,
          });
        }
        setEditingGoalId(null);
      }

      const res = await fetch(`/api/goals/${goalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Goal approved and locked!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to approve goal");
      }
    } catch (e: any) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (goalId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/goals/${goalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return", comment: returnComment }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Goal returned for revision");
        setReturningGoalId(null);
        setReturnComment("");
        fetchData();
      } else {
        toast.error(data.error || "Failed to return goal");
      }
    } catch (e: any) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlock = async (goalId: string) => {
    if (actionLoading || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: "approved", locked_at: null })
        .eq("id", goalId);

      if (error) throw error;

      await logAudit({
        userId: currentUser.id,
        goalId: goalId,
        action: "GOAL_UNLOCKED",
        entityType: "goal",
        supabaseClient: supabase,
      });

      toast.success("Goal unlocked. Employee can now edit and resubmit.");
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to unlock goal");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      let reportsQuery = supabase.from("users").select("*, departments(name)");
      
      if (currentUser.role === "admin") {
        reportsQuery = reportsQuery.eq("role", "employee");
      } else {
        reportsQuery = reportsQuery.eq("manager_id", currentUser.id);
      }

      const { data: reports, error: rErr } = await reportsQuery;
      if (rErr) throw rErr;

      const ids = (reports || []).map((r) => r.id);
      if (ids.length === 0) { setTeam([]); return; }

      const { data: goals, error: gErr } = await supabase
        .from("goals")
        .select("*, thrust_areas(*)")
        .in("employee_id", ids);
      if (gErr) throw gErr;

      const mapped = (reports || []).map((u) => ({
        ...u,
        goals: (goals || []).filter((g) => g.employee_id === u.id),
      }));

      setTeam(mapped as any);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load team goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && currentUser) fetchData();
  }, [mounted, currentUser?.id]);

  // ── Realtime: re-fetch when any goal row changes ──────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`team-goals:manager:${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "goals" },
        (payload) => {
          const oldStatus = payload.old?.status as string | undefined;
          const newStatus = payload.new?.status as string | undefined;
          const goalTitle = (payload.new?.title as string) ?? "A goal";
          // Notify manager when employee submits a goal
          if (oldStatus && newStatus && oldStatus !== newStatus && newStatus === "submitted") {
            toast.info(`New goal submitted for approval`, {
              description: `"${goalTitle}" is awaiting your review.`,
              duration: 6000,
            });
          }
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "goals" },
        () => { fetchData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // ── Flatten rows for the table ───────────────────────────────────────────
  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const member of team) {
      const totalW = member.goals.reduce((s, g) => s + Number(g.weightage), 0);
      const alignment = totalW > 0 ? Math.min(100, Math.round(totalW)) : 0;
      for (const goal of member.goals) {
        rows.push({ employee: member, goal, alignment });
      }
      // If a member has no goals, still show them
      if (member.goals.length === 0) {
        rows.push({ employee: member, goal: null as any, alignment: 0 });
      }
    }
    return rows;
  }, [team]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const allGoals = team.flatMap((m) => m.goals);
  const totalGoals = allGoals.length;

  const avgAlignment = useMemo(() => {
    if (team.length === 0) return 0;
    const scores = team.map((m) => {
      const w = m.goals.reduce((s, g) => s + Number(g.weightage), 0);
      return Math.min(100, w);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / team.length);
  }, [team]);

  const alignmentLabel =
    avgAlignment >= 90
      ? "Excellent Alignment"
      : avgAlignment >= 70
      ? "Good Alignment"
      : avgAlignment >= 50
      ? "Needs Improvement"
      : "Low Alignment";

  // Thrust area distribution
  const thrustDist = useMemo(() => {
    const map: Record<string, { name: string; color: string; count: number }> = {};
    for (const g of allGoals) {
      if (!g.thrust_areas) continue;
      const id = g.thrust_areas.id;
      if (!map[id]) map[id] = { name: g.thrust_areas.name, color: g.thrust_areas.color, count: 0 };
      map[id].count += 1;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allGoals]);

  // All thrust areas for filter
  const thrustOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    for (const g of allGoals) {
      if (g.thrust_areas && !seen.has(g.thrust_areas.id)) {
        seen.add(g.thrust_areas.id);
        opts.push({ id: g.thrust_areas.id, name: g.thrust_areas.name });
      }
    }
    return opts;
  }, [allGoals]);

  // ── Filtered rows ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return flatRows.filter((row) => {
      const nameMatch = row.employee.name.toLowerCase().includes(search.toLowerCase());
      const thrustMatch =
        thrustFilter === "all" ||
        row.goal?.thrust_areas?.id === thrustFilter;
      const statusMatch =
        statusFilter === "all" || row.goal?.status === statusFilter;
      return nameMatch && thrustMatch && statusMatch;
    });
  }, [flatRows, search, thrustFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const csv = [
      ["Employee", "Role", "Department", "Goal Title", "Thrust Area", "Target", "Target Date", "Status", "Alignment %"],
      ...flatRows.map((r) => [
        r.employee.name,
        r.employee.role,
        r.employee.departments?.name ?? "",
        r.goal?.title ?? "",
        r.goal?.thrust_areas?.name ?? "",
        r.goal?.target_value ?? "",
        r.goal?.target_date ?? "",
        r.goal?.status ?? "",
        r.alignment,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_goals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Team Goals</h1>
        <p className="mt-0.5 text-sm text-[#464555]">
          Overseeing {team.length} direct reports for Q2 2025 Cycle
        </p>
      </div>

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1 — Total Active Goals */}
          <div className="rounded-xl border border-[#e4e1ee] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#464555]">
              Total Active Goals
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-5xl font-bold text-[#1b1b24]">{totalGoals}</span>
              <span className="mb-1 rounded-full bg-[#e0e7ff] px-2.5 py-0.5 text-[10px] font-bold text-[#4f46e5]">
                Across {team.length} Employees
              </span>
            </div>
            {/* thin progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-[#e4e1ee]">
              <div
                className="h-1.5 rounded-full bg-[#4f46e5] transition-all duration-700"
                style={{ width: `${Math.min(100, (totalGoals / (team.length * 5 || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Card 2 — Alignment Score */}
          <div className="flex items-center gap-5 rounded-xl border border-[#e4e1ee] bg-white p-5 shadow-sm">
            <AlignmentRing pct={avgAlignment} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#464555]">
                Alignment Score
              </p>
              <p className="mt-1 text-lg font-bold text-[#1b1b24]">{alignmentLabel}</p>
              <p className="mt-0.5 text-xs text-[#777587]">High contribution to OKRs</p>
            </div>
          </div>

          {/* Card 3 — Goal Distribution */}
          <div className="rounded-xl border border-[#e4e1ee] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#464555]">
              Goal Distribution (Thrust Areas)
            </p>
            <div className="mt-3 space-y-2.5">
              {thrustDist.length === 0 ? (
                <p className="text-xs text-[#777587]">No data yet</p>
              ) : (
                thrustDist.map((t) => {
                  const pct = totalGoals > 0 ? Math.round((t.count / totalGoals) * 100) : 0;
                  return (
                    <div key={t.name}>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#1b1b24]">{t.name}</span>
                        <span className="font-semibold text-[#464555]">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[#e4e1ee]">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: t.color || "#4f46e5" }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Table Panel ── */}
      <div className="rounded-xl border border-[#e4e1ee] bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e1ee] p-4">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777587]" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 w-full rounded-lg border border-[#e4e1ee] bg-[#f0ecf9] pl-9 pr-3 text-sm text-[#1b1b24] placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
            />
          </div>

          {/* Thrust Filter */}
          <select
            value={thrustFilter}
            onChange={(e) => { setThrustFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-[#e4e1ee] bg-white px-3 text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
          >
            <option value="all">Thrust Area: All</option>
            {thrustOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-[#e4e1ee] bg-white px-3 text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
          >
            <option value="all">Status: All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="returned">Needs Revision</option>
            <option value="locked">Locked</option>
          </select>

          <div className="ml-auto">
            <button
              onClick={handleExport}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e4e1ee] bg-white px-3 text-sm font-medium text-[#464555] hover:bg-[#f0ecf9] transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ecf9]">
                {["Employee", "Goal Title", "Thrust Area", "Target", "Status", "Alignment", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#777587]"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf9]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                    <p className="text-sm text-[#777587]">No goals found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const { label: statusLabel, dotColor, textColor } = getStatusMeta(row.goal?.status ?? "");
                  const targetDisplay = row.goal
                    ? `${row.goal.target_value}${row.goal.uom_type === "percentage" ? "%" : ""}`
                    : "—";
                  const dateDisplay = row.goal?.target_date
                    ? new Date(row.goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "Q2 End";

                  return (
                    <tr
                      key={`${row.employee.id}-${row.goal?.id ?? idx}`}
                      className="group hover:bg-[#f5f2ff] transition-colors duration-100"
                    >
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            {row.employee.profile_pic && <AvatarImage src={row.employee.profile_pic} alt={row.employee.name} />}
                            <AvatarFallback className="bg-[#e0e7ff] text-[#4f46e5] text-xs font-bold">
                              {row.employee.avatar_initials || row.employee.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-[#1b1b24] whitespace-nowrap">
                              {row.employee.name}
                            </p>
                            <p className="text-[11px] text-[#777587]">
                              {row.employee.departments?.name ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Goal Title */}
                      <td className="px-5 py-3.5 max-w-[280px]">
                        {row.goal ? (
                          <>
                            <p className="text-sm font-semibold text-[#4f46e5] leading-tight truncate">
                              {row.goal.title}
                            </p>
                            {row.goal.description && (
                              <p className="mt-0.5 text-[11px] text-[#777587] truncate">
                                {row.goal.description}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs italic text-[#777587]">No goals yet</span>
                        )}
                      </td>

                      {/* Thrust Area */}
                      <td className="px-5 py-3.5">
                        {row.goal?.thrust_areas ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{
                              backgroundColor: row.goal.thrust_areas.bg_color || "#e0e7ff",
                              color: row.goal.thrust_areas.color || "#4f46e5",
                            }}
                          >
                            {row.goal.thrust_areas.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#777587]">—</span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-[#1b1b24]">{targetDisplay}</p>
                        <p className="text-[11px] text-[#777587]">{dateDisplay}</p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className={cn("text-xs font-medium", textColor)}>
                            {statusLabel}
                          </span>
                        </div>
                      </td>

                      {/* Alignment */}
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            row.alignment >= 90
                              ? "text-[#4f46e5]"
                              : row.alignment >= 70
                              ? "text-green-600"
                              : row.alignment >= 50
                              ? "text-amber-600"
                              : "text-red-500"
                          )}
                        >
                          {row.goal ? `${row.alignment}%` : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 align-top">
                        {row.goal?.status === "submitted" ? (
                          <div className="flex flex-col gap-2">
                            {/* FIX 6: Inline editing for target/weightage */}
                            {editingGoalId === row.goal.id && (
                              <div className="flex flex-col gap-1.5 w-52 p-2 border border-indigo-200 rounded-lg bg-indigo-50">
                                <p className="text-[10px] font-bold uppercase text-indigo-600">Edit before approving</p>
                                <div className="flex gap-1 items-center">
                                  <label className="text-[10px] w-16 shrink-0 text-gray-500">Target</label>
                                  <Input
                                    type="number"
                                    value={editTarget}
                                    onChange={(e) => setEditTarget(e.target.value)}
                                    placeholder={String(row.goal.target_value ?? "")}
                                    className="h-6 text-xs"
                                  />
                                </div>
                                <div className="flex gap-1 items-center">
                                  <label className="text-[10px] w-16 shrink-0 text-gray-500">Weight %</label>
                                  <Input
                                    type="number"
                                    value={editWeightage}
                                    onChange={(e) => setEditWeightage(e.target.value)}
                                    placeholder={String(row.goal.weightage)}
                                    className="h-6 text-xs"
                                    min={10}
                                    max={100}
                                  />
                                </div>
                              </div>
                            )}
                            {returningGoalId === row.goal.id ? (
                              <div className="flex flex-col gap-1 w-48 relative z-10 bg-white p-2 border shadow-sm rounded-lg">
                                <textarea
                                  autoFocus
                                  placeholder="Reason for return..."
                                  value={returnComment}
                                  onChange={(e) => setReturnComment(e.target.value)}
                                  className="w-full h-16 text-xs p-2 border rounded resize-none focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                />
                                <div className="flex items-center gap-1 justify-end mt-1">
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" disabled={actionLoading} onClick={() => { setReturningGoalId(null); setReturnComment(""); }}>Cancel</Button>
                                  <Button size="sm" className="h-6 px-2 text-[10px] bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading || !returnComment.trim()} onClick={() => handleReturn(row.goal.id)}>Submit</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                  disabled={actionLoading}
                                  onClick={() => handleApprove(row.goal.id, row.alignment)}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={actionLoading}
                                  onClick={() => setReturningGoalId(row.goal.id)}
                                >
                                  Return
                                </Button>
                                {/* FIX 6: Edit toggle */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => {
                                    if (editingGoalId === row.goal.id) { setEditingGoalId(null); } else {
                                      setEditingGoalId(row.goal.id);
                                      setEditTarget(String(row.goal.target_value ?? ""));
                                      setEditWeightage(String(row.goal.weightage));
                                    }
                                  }}
                                >
                                  {editingGoalId === row.goal.id ? "Cancel Edit" : "Edit"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : row.goal?.status === "locked" && currentUser?.role === "admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            disabled={actionLoading}
                            onClick={() => handleUnlock(row.goal.id)}
                          >
                            Unlock
                          </Button>
                        ) : (
                          <span className="text-xs text-[#777587]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FIX 8: Confirmation Dialog for piecemeal approval */}
        <Dialog open={!!confirmGoalId} onOpenChange={() => setConfirmGoalId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Confirm Partial Approval
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              This employee&apos;s goals currently total{" "}
              <span className="font-bold text-amber-600">{confirmEmployeeTotal}%</span>. Are you sure you want to approve before the total reaches 100%?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmGoalId(null)}>Cancel</Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => confirmGoalId && doApprove(confirmGoalId)}
                disabled={actionLoading}
              >
                Yes, Approve Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pagination Footer */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#f0ecf9] px-5 py-3">
            <p className="text-xs text-[#777587]">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              {filtered.length === 1 ? "entry" : "entries"}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e1ee] text-[#464555] hover:bg-[#f0ecf9] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                    page === p
                      ? "bg-[#4f46e5] text-white"
                      : "border border-[#e4e1ee] text-[#464555] hover:bg-[#f0ecf9]"
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e1ee] text-[#464555] hover:bg-[#f0ecf9] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
