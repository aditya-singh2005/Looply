"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Edit2, XCircle, CheckCircle2, ChevronRight, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/useRole";
import { createClient } from "@/lib/supabase";
import { logAudit } from "@/lib/supabase/audit";
import type { GoalCycle } from "@/types";

export default function CycleManagement() {
  const { user: currentUser, mounted } = useRole();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cycles, setCycles] = useState<GoalCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);

  // Modals visibility
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCycleData, setEditCycleData] = useState<GoalCycle | null>(null);

  // Create Cycle Form State
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newGoalSettingStart, setNewGoalSettingStart] = useState("");
  const [newGoalSettingEnd, setNewGoalSettingEnd] = useState("");
  const [newQ1Start, setNewQ1Start] = useState("");
  const [newQ1End, setNewQ1End] = useState("");
  const [newQ2Start, setNewQ2Start] = useState("");
  const [newQ2End, setNewQ2End] = useState("");
  const [newQ3Start, setNewQ3Start] = useState("");
  const [newQ3End, setNewQ3End] = useState("");
  const [newQ4Start, setNewQ4Start] = useState("");
  const [newQ4End, setNewQ4End] = useState("");

  // Edit Cycle Form State
  const [editName, setEditName] = useState("");
  const [editGoalSettingStart, setEditGoalSettingStart] = useState("");
  const [editGoalSettingEnd, setEditGoalSettingEnd] = useState("");
  const [editQ1Start, setEditQ1Start] = useState("");
  const [editQ1End, setEditQ1End] = useState("");
  const [editQ2Start, setEditQ2Start] = useState("");
  const [editQ2End, setEditQ2End] = useState("");
  const [editQ3Start, setEditQ3Start] = useState("");
  const [editQ3End, setEditQ3End] = useState("");
  const [editQ4Start, setEditQ4Start] = useState("");
  const [editQ4End, setEditQ4End] = useState("");

  // Fetch cycles
  const fetchCycles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("goal_cycles")
        .select("*")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allCycles = (data || []) as GoalCycle[];
      setCycles(allCycles);

      // Extract active cycle
      const active = allCycles.find((c: any) => c.is_active === true);
      setActiveCycle(active || null);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchCycles();
    }

    // Realtime channel
    const channel = supabase
      .channel("admin-cycles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_cycles" },
        () => {
          fetchCycles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted]);

  // Reset Create Form
  const resetCreateForm = () => {
    setNewName("");
    setNewYear(new Date().getFullYear().toString());
    setNewGoalSettingStart("");
    setNewGoalSettingEnd("");
    setNewQ1Start("");
    setNewQ1End("");
    setNewQ2Start("");
    setNewQ2End("");
    setNewQ3Start("");
    setNewQ3End("");
    setNewQ4Start("");
    setNewQ4End("");
  };

  // Open Edit Modal and prefill data
  const openEditModal = (cycle: GoalCycle) => {
    setEditCycleData(cycle);
    setEditName(cycle.name);
    setEditGoalSettingStart(cycle.goal_setting_start || "");
    setEditGoalSettingEnd(cycle.goal_setting_end || "");
    setEditQ1Start(cycle.q1_start || "");
    setEditQ1End(cycle.q1_end || "");
    setEditQ2Start(cycle.q2_start || "");
    setEditQ2End(cycle.q2_end || "");
    setEditQ3Start(cycle.q3_start || "");
    setEditQ3End(cycle.q3_end || "");
    setEditQ4Start(cycle.q4_start || "");
    setEditQ4End(cycle.q4_end || "");
    setShowEditModal(true);
  };

  // Create Cycle
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const newCycleObj = {
        name: newName,
        year: Number(newYear),
        status: "draft" as const,
        is_active: false,
        goal_setting_start: newGoalSettingStart || null,
        goal_setting_end: newGoalSettingEnd || null,
        q1_start: newQ1Start || null,
        q1_end: newQ1End || null,
        q2_start: newQ2Start || null,
        q2_end: newQ2End || null,
        q3_start: newQ3Start || null,
        q3_end: newQ3End || null,
        q4_start: newQ4Start || null,
        q4_end: newQ4End || null,
      };

      const { data: createdData, error: insertErr } = await supabase
        .from("goal_cycles")
        .insert(newCycleObj)
        .select()
        .single();

      if (insertErr) throw insertErr;

      const activate = window.confirm("Set this as the active cycle?");
      if (activate) {
        // Set new active cycle
        const { error: activeErr } = await supabase
          .from("goal_cycles")
          .update({ is_active: true, status: "active" })
          .eq("id", createdData.id);
        if (activeErr) throw activeErr;

        // Set previous active cycle to closed
        if (activeCycle) {
          const { error: prevErr } = await supabase
            .from("goal_cycles")
            .update({ is_active: false, status: "closed" })
            .eq("id", activeCycle.id);
          if (prevErr) throw prevErr;
        }
      }

      await logAudit({
        userId: currentUser.id,
        action: "CYCLE_CREATED",
        entityType: "cycle",
        newValue: { ...newCycleObj, id: createdData.id, is_active: activate, status: activate ? "active" : "draft" },
        supabaseClient: supabase,
      });

      toast.success("New cycle created successfully!");
      setShowCreateModal(false);
      resetCreateForm();
      fetchCycles();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create new cycle");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Cycle
  const handleEditCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCycleData || actionLoading || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const updatedFields = {
        name: editName,
        goal_setting_start: editGoalSettingStart || null,
        goal_setting_end: editGoalSettingEnd || null,
        q1_start: editQ1Start || null,
        q1_end: editQ1End || null,
        q2_start: editQ2Start || null,
        q2_end: editQ2End || null,
        q3_start: editQ3Start || null,
        q3_end: editQ3End || null,
        q4_start: editQ4Start || null,
        q4_end: editQ4End || null,
      };

      const { error: updateErr } = await supabase
        .from("goal_cycles")
        .update(updatedFields)
        .eq("id", editCycleData.id);

      if (updateErr) throw updateErr;

      const oldDates = {
        name: editCycleData.name,
        goal_setting_start: editCycleData.goal_setting_start,
        goal_setting_end: editCycleData.goal_setting_end,
        q1_start: editCycleData.q1_start,
        q1_end: editCycleData.q1_end,
        q2_start: editCycleData.q2_start,
        q2_end: editCycleData.q2_end,
        q3_start: editCycleData.q3_start,
        q3_end: editCycleData.q3_end,
        q4_start: editCycleData.q4_start,
        q4_end: editCycleData.q4_end,
      };

      await logAudit({
        userId: currentUser.id,
        action: "CYCLE_UPDATED",
        entityType: "cycle",
        oldValue: oldDates,
        newValue: updatedFields,
        supabaseClient: supabase,
      });

      toast.success("Cycle updated successfully!");
      setShowEditModal(false);
      fetchCycles();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update cycle");
    } finally {
      setActionLoading(false);
    }
  };

  // Close Cycle
  const handleCloseActiveCycle = async () => {
    if (!activeCycle || actionLoading || !currentUser?.id) return;
    const confirmClose = window.confirm("This will close the cycle and lock all editing. Are you sure?");
    if (!confirmClose) return;

    setActionLoading(true);
    try {
      const { error: closeErr } = await supabase
        .from("goal_cycles")
        .update({ status: "closed", is_active: false })
        .eq("id", activeCycle.id);

      if (closeErr) throw closeErr;

      await logAudit({
        userId: currentUser.id,
        action: "CYCLE_CLOSED",
        entityType: "cycle",
        oldValue: { id: activeCycle.id, status: activeCycle.status, is_active: activeCycle.is_active },
        newValue: { id: activeCycle.id, status: "closed", is_active: false },
        supabaseClient: supabase,
      });

      toast.success("Cycle closed successfully!");
      fetchCycles();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to close cycle");
    } finally {
      setActionLoading(false);
    }
  };

  // Date formatter helper
  const formatDateString = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr.replace(/-/g, "/")).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Phase status helper
  const getPhaseStatus = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr || !endStr) return { label: "Upcoming", badgeClass: "bg-gray-100 text-gray-500 border-none" };
    const now = new Date();
    const start = new Date(startStr.replace(/-/g, "/"));
    const end = new Date(endStr.replace(/-/g, "/"));
    end.setHours(23, 59, 59, 999);

    if (now > end) {
      return { label: "Done", badgeClass: "bg-green-50 text-green-700 hover:bg-green-50 border-none px-2.5" };
    } else if (now >= start && now <= end) {
      return { label: "Active", badgeClass: "bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none px-2.5 font-semibold" };
    } else {
      return { label: "Upcoming", badgeClass: "bg-gray-50 text-gray-400 border-none px-2.5" };
    }
  };

  // Filter out previous closed cycles
  const closedCycles = cycles.filter((c: any) => c.status === "closed" && c.id !== activeCycle?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Cycle Management</h1>
          <p className="text-[#464555] text-sm mt-0.5">Configure goal-setting windows, quarterly submission deadlines, and cycles lifecycle.</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create New Cycle
        </Button>
      </div>

      {loading ? (
        <div className="h-60 flex flex-col items-center justify-center bg-white rounded-xl border border-[#e4e1ee] shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <span className="text-sm text-[#777587]">Loading cycles data...</span>
        </div>
      ) : (
        <>
          {/* Active Cycle Card */}
          {activeCycle ? (
            <Card className="bg-white border-l-4 border-l-[#4f46e5] border-[#e4e1ee] shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[#1b1b24]">{activeCycle.name}</h2>
                  <Badge className="bg-green-50 text-green-700 border-none text-xs flex items-center gap-1.5 px-2.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                  </Badge>
                  <span className="text-xs text-[#777587] font-medium">Year: {activeCycle.year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => openEditModal(activeCycle)}
                    className="text-indigo-600 font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Edit Cycle
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCloseActiveCycle}
                    className="text-red-600 font-semibold text-sm hover:bg-red-50 hover:text-red-700"
                  >
                    Close Cycle
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0ecf9]">
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Phase</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Opens</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Closes</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[#f0ecf9]">
                    {[
                      { name: "Goal Setting", start: activeCycle.goal_setting_start, end: activeCycle.goal_setting_end },
                      { name: "Q1 Check-in", start: activeCycle.q1_start, end: activeCycle.q1_end },
                      { name: "Q2 Check-in", start: activeCycle.q2_start, end: activeCycle.q2_end },
                      { name: "Q3 Check-in", start: activeCycle.q3_start, end: activeCycle.q3_end },
                      { name: "Q4 Check-in / Annual", start: activeCycle.q4_start, end: activeCycle.q4_end },
                    ].map((phase) => {
                      const status = getPhaseStatus(phase.start, phase.end);
                      return (
                        <tr key={phase.name} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#1b1b24]">{phase.name}</td>
                          <td className="py-3.5 px-4 text-[#464555] font-medium">{formatDateString(phase.start)}</td>
                          <td className="py-3.5 px-4 text-[#464555] font-medium">{formatDateString(phase.end)}</td>
                          <td className="py-3.5 px-4">
                            <Badge className={status.badgeClass}>
                              {status.label === "Active" && (
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse mr-1" />
                              )}
                              {status.label === "Done" && <span className="mr-1">✓</span>}
                              {status.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="bg-amber-50/50 border-l-4 border-l-amber-500 border-[#e4e1ee] shadow-sm p-6 text-center">
              <Calendar className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#1b1b24]">No active performance cycle found</h2>
              <p className="text-[#464555] text-sm mt-1 mb-4">Create a new cycle or activate a previous draft cycle to open goal-setting windows.</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#4f46e5] hover:bg-indigo-700 text-white"
              >
                Create First Cycle
              </Button>
            </Card>
          )}

          {/* Past Cycles Table */}
          <Card className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#f0ecf9]">
              <h2 className="font-bold text-[#1b1b24] text-base">Previous Cycles</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#f0ecf9]">
                    <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Cycle Name</th>
                    <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Year</th>
                    <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#777587]">Status</th>
                    <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#777587] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#f0ecf9]">
                  {closedCycles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#777587] italic">No closed previous cycles.</td>
                    </tr>
                  ) : (
                    closedCycles.map((cycle) => (
                      <tr key={cycle.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-5 font-semibold text-[#1b1b24]">{cycle.name}</td>
                        <td className="py-4 px-5 text-[#464555] font-medium">{cycle.year}</td>
                        <td className="py-4 px-5">
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-none font-medium">
                            Closed
                          </Badge>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <a
                            href="/admin/reports"
                            className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline text-xs"
                          >
                            View Report <ArrowRight className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── CREATE CYCLE MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#e4e1ee]">
            <div className="p-6 border-b border-[#f0ecf9] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-[#1b1b24]">Create New Performance Cycle</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Cycle Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Performance Cycle 2026"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Year</label>
                  <input
                    type="number"
                    required
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="border-t border-[#f0ecf9] pt-4">
                <h3 className="text-sm font-bold text-[#1b1b24] mb-4">Set Windows Dates</h3>
                <div className="space-y-4">
                  {/* Goal setting */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">1. Goal Setting Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={newGoalSettingStart}
                        onChange={(e) => setNewGoalSettingStart(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={newGoalSettingEnd}
                        onChange={(e) => setNewGoalSettingEnd(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q1 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-green-700">2. Q1 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={newQ1Start}
                        onChange={(e) => setNewQ1Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={newQ1End}
                        onChange={(e) => setNewQ1End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q2 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">3. Q2 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={newQ2Start}
                        onChange={(e) => setNewQ2Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={newQ2End}
                        onChange={(e) => setNewQ2End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q3 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">4. Q3 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={newQ3Start}
                        onChange={(e) => setNewQ3Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={newQ3End}
                        onChange={(e) => setNewQ3End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q4 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">5. Q4 / Annual Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={newQ4Start}
                        onChange={(e) => setNewQ4Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={newQ4End}
                        onChange={(e) => setNewQ4End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#f0ecf9] pt-4 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create Cycle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CYCLE MODAL ── */}
      {showEditModal && editCycleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#e4e1ee]">
            <div className="p-6 border-b border-[#f0ecf9] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-[#1b1b24]">Edit Active Performance Cycle</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditCycle} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Cycle Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Performance Cycle 2026"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="border-t border-[#f0ecf9] pt-4">
                <h3 className="text-sm font-bold text-[#1b1b24] mb-4">Set Windows Dates</h3>
                <div className="space-y-4">
                  {/* Goal setting */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">1. Goal Setting Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={editGoalSettingStart}
                        onChange={(e) => setEditGoalSettingStart(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={editGoalSettingEnd}
                        onChange={(e) => setEditGoalSettingEnd(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q1 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-green-700">2. Q1 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={editQ1Start}
                        onChange={(e) => setEditQ1Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={editQ1End}
                        onChange={(e) => setEditQ1End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q2 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">3. Q2 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={editQ2Start}
                        onChange={(e) => setEditQ2Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={editQ2End}
                        onChange={(e) => setEditQ2End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q3 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">4. Q3 Check-in Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={editQ3Start}
                        onChange={(e) => setEditQ3Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={editQ3End}
                        onChange={(e) => setEditQ3End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Q4 */}
                  <div className="bg-[#fcfcff] p-4 rounded-lg border border-[#e4e1ee] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">5. Q4 / Annual Phase</h4>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Opens</label>
                      <input
                        type="date"
                        required
                        value={editQ4Start}
                        onChange={(e) => setEditQ4Start(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#777587] mb-1">Closes</label>
                      <input
                        type="date"
                        required
                        value={editQ4End}
                        onChange={(e) => setEditQ4End(e.target.value)}
                        className="w-full h-9 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#f0ecf9] pt-4 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
