"use client";

import { useEffect, useState } from "react";
import { Share2, Info, Lock, XCircle, Loader2, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/hooks/useRole";
import { logAudit } from "@/lib/supabase/audit";
import { toast } from "sonner";

export default function SharedGoals() {
  const supabase = createClient();
  const { user: currentUser, mounted } = useRole();

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Visibility
  const [showPushModal, setShowPushModal] = useState(false);
  const [step, setStep] = useState(1);

  // Modal Form Data - Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thrustAreaId, setThrustAreaId] = useState("");
  const [uomType, setUomType] = useState("numeric_min");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [defaultWeightage, setDefaultWeightage] = useState("10");

  // Modal Form Data - Step 2
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState("");

  // Fetched dropdowns data
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);

  // Selected Goal Details View
  const [viewingGoal, setViewingGoal] = useState<any>(null);

  async function loadSharedGoals() {
    try {
      const { data } = await supabase
        .from('goals')
        .select(`
          *,
          thrust_areas(name, color, bg_color),
          users(name, department_id),
          linked:goals(id, employee_id, users(name))
        `)
        .eq('is_shared', true)
        .is('shared_from_goal_id', null);
      setGoals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const loadModalData = async () => {
    try {
      // 1. Fetch thrust areas
      const { data: ta } = await supabase
        .from("thrust_areas")
        .select("*")
        .order("name", { ascending: true });
      setThrustAreas(ta || []);

      if (ta && ta.length > 0 && !thrustAreaId) {
        setThrustAreaId(ta[0].id);
      }

      // 2. Fetch employees
      const { data: emp } = await supabase
        .from("users")
        .select("*, departments(name)")
        .eq("role", "employee")
        .order("name", { ascending: true });
      setEmployees(emp || []);

      // 3. Fetch active cycle
      const { data: cycle } = await supabase
        .from("goal_cycles")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      setActiveCycle(cycle);
    } catch (err) {
      console.error("Error loading modal data:", err);
      toast.error("Failed to load setup options");
    }
  };

  useEffect(() => {
    if (mounted) {
      loadSharedGoals();
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-shared-goals:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => { loadSharedGoals(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { loadSharedGoals(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted, supabase]);

  const handleOpenPushModal = () => {
    loadModalData();
    setStep(1);
    setTitle("");
    setDescription("");
    setUomType("numeric_min");
    setTargetValue("");
    setTargetDate("");
    setDefaultWeightage("10");
    setSelectedEmployees([]);
    setEmpSearch("");
    setShowPushModal(true);
  };

  const handleSelectAll = () => {
    const filteredIds = filteredEmployees.map((e) => e.id);
    setSelectedEmployees(Array.from(new Set([...selectedEmployees, ...filteredIds])));
  };

  const handleDeselectAll = () => {
    const filteredIds = filteredEmployees.map((e) => e.id);
    setSelectedEmployees(selectedEmployees.filter((id) => !filteredIds.includes(id)));
  };

  const handleToggleEmployee = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter((x) => x !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handlePushGoal = async () => {
    if (actionLoading || !currentUser?.id) return;
    if (!activeCycle?.id) {
      toast.error("No active cycle found. Please activate a cycle first before pushing shared goals.");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Insert parent goal owned by the Admin
      const parentGoal = {
        title,
        description: description || null,
        thrust_area_id: thrustAreaId || null,
        uom_type: uomType,
        target_value: uomType !== "timeline" && uomType !== "zero" && targetValue ? Number(targetValue) : null,
        target_date: uomType === "timeline" && targetDate ? targetDate : null,
        weightage: Number(defaultWeightage),
        is_shared: true,
        shared_from_goal_id: null,
        status: "locked" as const,
        locked_at: new Date().toISOString(),
        employee_id: currentUser.id,
        cycle_id: activeCycle.id,
      };

      const { data: parentData, error: parentErr } = await supabase
        .from("goals")
        .insert(parentGoal)
        .select()
        .single();

      if (parentErr) throw parentErr;

      // 2. Insert children goals for each selected employee
      const childGoals = selectedEmployees.map((empId) => ({
        title,
        description: description || null,
        thrust_area_id: thrustAreaId || null,
        uom_type: uomType,
        target_value: uomType !== "timeline" && uomType !== "zero" && targetValue ? Number(targetValue) : null,
        target_date: uomType === "timeline" && targetDate ? targetDate : null,
        weightage: Number(defaultWeightage),
        is_shared: true,
        shared_from_goal_id: parentData.id,
        status: "locked" as const,
        locked_at: parentData.locked_at,
        employee_id: empId,
        cycle_id: activeCycle.id,
      }));

      const { error: childrenErr } = await supabase
        .from("goals")
        .insert(childGoals);

      if (childrenErr) throw childrenErr;

      // 3. Log Audit
      await logAudit({
        userId: currentUser.id,
        goalId: parentData.id,
        action: "SHARED_GOAL_PUSHED",
        entityType: "goal",
        newValue: { recipientCount: selectedEmployees.length },
        supabaseClient: supabase,
      });

      toast.success(`Shared goal successfully pushed to ${selectedEmployees.length} employees!`);
      setShowPushModal(false);
      loadSharedGoals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to push shared goal");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEmployees = employees.filter((e) =>
    e.name?.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.departments?.name?.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Shared Goals</h1>
          <p className="text-[#464555] text-sm mt-1 max-w-xl">
            Push departmental KPIs to multiple employees. Recipients can only adjust weightage.
          </p>
        </div>
        <Button
          onClick={handleOpenPushModal}
          className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Push New Shared Goal
        </Button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 font-medium">
          Shared goals have locked titles and targets. Recipients can only adjust their weightage allocation. Achievement updates by the primary owner sync to all linked employees.
        </p>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Share2 className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-[#1b1b24]">No shared goals yet</h2>
          <p className="text-[#777587] text-sm mt-1 mb-6">Push a departmental KPI to your team</p>
          <Button
            onClick={handleOpenPushModal}
            className="bg-[#4f46e5] hover:bg-indigo-700 text-white"
          >
            Push First Shared Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <Card key={goal.id} className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-[#f0ecf9] flex justify-between items-center">
                <div className="flex flex-col items-start gap-2">
                  <Badge
                    className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: goal.thrust_areas?.bg_color || '#e0e7ff',
                      color: goal.thrust_areas?.color || '#4f46e5'
                    }}
                  >
                    {goal.thrust_areas?.name}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[#1b1b24]">{goal.title}</h3>
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  {goal.description && (
                    <p className="text-xs text-[#777587] max-w-xl mt-1">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-semibold px-3 py-1 text-xs">
                    Shared with {goal.linked?.length || 0} employees
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={() => setViewingGoal(goal)}
                    className="text-indigo-600 font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── STEP-BY-STEP PUSH SHARED GOAL MODAL ── */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-[#e4e1ee]">
            <div className="p-6 border-b border-[#f0ecf9] flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-[#1b1b24]">Push New Shared Goal</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`}></span>
                  <span className="text-[11px] font-semibold text-[#777587]">Step 1: KPI Details</span>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></span>
                  <span className="text-[11px] font-semibold text-[#777587]">Step 2: Recipients</span>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <span className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></span>
                  <span className="text-[11px] font-semibold text-[#777587]">Step 3: Confirm</span>
                </div>
              </div>
              <button
                onClick={() => setShowPushModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* STEP 1: KPI DETAILS FORM */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Goal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Achieve 95% SLA adherence across core services"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Description</label>
                  <textarea
                    placeholder="Describe how the goal should be measured and standard achievements expected..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-20 px-3 py-2 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Thrust Area</label>
                    <select
                      value={thrustAreaId}
                      onChange={(e) => setThrustAreaId(e.target.value)}
                      className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {thrustAreas.map((ta) => (
                        <option key={ta.id} value={ta.id}>{ta.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Unit of Measure (UoM)</label>
                    <select
                      value={uomType}
                      onChange={(e) => setUomType(e.target.value)}
                      className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="numeric_min">Numeric Minimum (Higher is Better)</option>
                      <option value="numeric_max">Numeric Maximum (Lower is Better)</option>
                      <option value="timeline">Timeline (Target Date)</option>
                      <option value="zero">Zero (Incident/Accident Target)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uomType !== "timeline" && uomType !== "zero" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Target Value</label>
                      <input
                        type="number"
                        placeholder="e.g. 95"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}

                  {uomType === "timeline" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Target Date</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Default Weightage (%)</label>
                    <select
                      value={defaultWeightage}
                      onChange={(e) => setDefaultWeightage(e.target.value)}
                      className="w-full h-10 px-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {[10, 15, 20, 25, 30, 40, 50, 60, 75, 100].map((v) => (
                        <option key={v} value={v}>{v}%</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => {
                      if (!title.trim()) {
                        toast.error("Please specify a goal title");
                        return;
                      }
                      setStep(2);
                    }}
                    className="bg-[#4f46e5] hover:bg-indigo-700 text-white flex items-center gap-1.5"
                  >
                    Next: Select Recipients <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT RECIPIENTS */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees or departments..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 border border-[#e4e1ee] rounded-lg text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">Select All</Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll} className="text-xs">Deselect All</Button>
                  </div>
                </div>

                <div className="border border-[#e4e1ee] rounded-xl max-h-[300px] overflow-y-auto divide-y divide-[#f0ecf9]">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-6 text-center text-[#777587] italic text-sm">No employees match this filter.</div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedEmployees.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleToggleEmployee(emp.id)}
                          className={`flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // toggled by outer click
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#1b1b24]">{emp.name}</p>
                              <p className="text-xs text-[#777587] mt-0.5">{emp.email}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-[#f0ecf9] text-[#4f46e5] border-none text-xs">
                            {emp.departments?.name || "No Dept"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#f0ecf9]">
                  <span className="text-xs font-semibold text-indigo-600">
                    {selectedEmployees.length} employees selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button
                      disabled={selectedEmployees.length === 0}
                      onClick={() => setStep(3)}
                      className="bg-[#4f46e5] hover:bg-indigo-700 text-white flex items-center gap-1.5"
                    >
                      Next: Confirm & Push <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRM & PUSH */}
            {step === 3 && (
              <div className="p-6 space-y-6">
                <div className="bg-[#fcfcff] p-5 rounded-xl border border-[#e4e1ee] space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587]">Shared Goal Parameters</h4>
                    <p className="text-base font-bold text-[#1b1b24] mt-1">{title}</p>
                    {description && <p className="text-sm text-[#464555] mt-1.5">{description}</p>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-[#f0ecf9] pt-4">
                    <div>
                      <span className="block text-[11px] font-semibold text-[#777587]">Thrust Area</span>
                      <span className="font-semibold text-[#1b1b24] mt-0.5 block">
                        {thrustAreas.find(t => t.id === thrustAreaId)?.name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-[#777587]">UoM Type</span>
                      <span className="font-semibold text-[#1b1b24] mt-0.5 block">
                        {uomType === "numeric_min" ? "Numeric Min" : uomType === "numeric_max" ? "Numeric Max" : uomType === "timeline" ? "Timeline" : "Zero"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-[#777587]">Target</span>
                      <span className="font-semibold text-[#1b1b24] mt-0.5 block">
                        {uomType === "timeline" ? targetDate : uomType === "zero" ? "0 Incidents" : targetValue}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-[#777587]">Default Weightage</span>
                      <span className="font-semibold text-[#1b1b24] mt-0.5 block">{defaultWeightage}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2.5">
                    Pushing to {selectedEmployees.length} Recipients
                  </h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                    {selectedEmployees.map((id) => {
                      const emp = employees.find((x) => x.id === id);
                      return (
                        <Badge key={id} variant="outline" className="bg-[#fcfcff] text-[#1b1b24] border-[#e4e1ee] px-2.5 py-1 text-xs">
                          {emp?.name || "N/A"} ({emp?.departments?.name || "N/A"})
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#f0ecf9]">
                  <Button variant="outline" disabled={actionLoading} onClick={() => setStep(2)}>Back</Button>
                  <Button
                    disabled={actionLoading}
                    onClick={handlePushGoal}
                    className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Pushing...
                      </>
                    ) : (
                      "Confirm & Push Goal"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW MODAL ── */}
      {viewingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-[#e4e1ee] p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-[#f0ecf9] pb-4">
              <div>
                <Badge
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: viewingGoal.thrust_areas?.bg_color || '#e0e7ff',
                    color: viewingGoal.thrust_areas?.color || '#4f46e5'
                  }}
                >
                  {viewingGoal.thrust_areas?.name}
                </Badge>
                <h2 className="text-lg font-bold text-[#1b1b24] mt-1.5 flex items-center gap-1.5">
                  {viewingGoal.title} <Lock className="w-4 h-4 text-gray-400" />
                </h2>
              </div>
              <button
                onClick={() => setViewingGoal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {viewingGoal.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587]">Description</h4>
                  <p className="text-sm text-[#464555] mt-1 leading-relaxed">{viewingGoal.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 border-y border-[#f0ecf9] py-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-[#777587]">UoM Type</span>
                  <span className="font-semibold text-[#1b1b24] mt-0.5 block">
                    {viewingGoal.uom_type === "numeric_min" ? "Numeric Min" : viewingGoal.uom_type === "numeric_max" ? "Numeric Max" : viewingGoal.uom_type === "timeline" ? "Timeline" : "Zero"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#777587]">Target Value</span>
                  <span className="font-semibold text-[#1b1b24] mt-0.5 block">
                    {viewingGoal.uom_type === "timeline" ? viewingGoal.target_date : viewingGoal.uom_type === "zero" ? "0 Accidents" : viewingGoal.target_value}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#777587]">Initial Weightage</span>
                  <span className="font-semibold text-[#1b1b24] mt-0.5 block">{viewingGoal.weightage}%</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2.5">
                  Linked Recipients ({viewingGoal.linked?.length || 0})
                </h4>
                <div className="border border-[#e4e1ee] rounded-xl max-h-[220px] overflow-y-auto divide-y divide-[#f0ecf9]">
                  {(!viewingGoal.linked || viewingGoal.linked.length === 0) ? (
                    <div className="p-4 text-center text-[#777587] italic text-xs">No employees assigned to this shared goal.</div>
                  ) : (
                    viewingGoal.linked.map((link: any) => (
                      <div key={link.id} className="flex items-center justify-between p-3">
                        <span className="text-sm font-semibold text-[#1b1b24]">{link.users?.name || "N/A"}</span>
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none font-medium text-xs">
                          Active Goal
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#f0ecf9] pt-4">
              <Button onClick={() => setViewingGoal(null)} className="bg-[#4f46e5] hover:bg-indigo-700 text-white">Close Details</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
