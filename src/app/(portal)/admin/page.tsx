"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Users, 
  Target, 
  CheckSquare, 
  AlertTriangle,
  ArrowRight,
  Unlock,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { logAudit } from "@/lib/supabase/audit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/useRole";
import { computeWeightedAverage } from "@/lib/supabase/queries";
import { getCurrentDate } from "@/lib/utils/dates";

type LockedGoal = {
  id: string;
  title: string;
  locked_at: string | null;
  employee_id: string;
  users: { name: string } | null;
  thrust_areas: { name: string } | null;
  goal_cycles: { name: string } | null;
};

export default function AdminOverview() {
  const supabase = createClient();
  const { user } = useRole();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepts: 0,
    goalsSubmitted: 0,
    goalsPending: 0,
    checkinCount: 0,
    totalEligible: 0,
    overdueActions: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [lockedGoals, setLockedGoals] = useState<LockedGoal[]>([]);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  async function loadData() {
    try {
      // 1. Employees & Departments
      const { data: users } = await supabase.from('users').select('id, name, email, role, department_id');
      const employees = users?.filter(u => u.role === 'employee') || [];
      const uniqueDepts = new Set(employees.map(e => e.department_id).filter(Boolean));
      
      // 2. Goals Submitted
      const { data: goals } = await supabase.from('goals').select('id, status');
      const submitted = goals?.filter(g => ['submitted', 'locked', 'approved'].includes(g.status)) || [];
      const pending = goals?.filter(g => g.status === 'submitted' || g.status === 'returned') || [];

      // 3. Check-ins
      const { data: achievements } = await supabase
        .from('goal_achievements')
        .select('goal_id, submitted_at')
        .eq('quarter', 'Q2')
        .not('submitted_at', 'is', null);
      
      const uniqueSubmitters = new Set(achievements?.map(a => a.goal_id));

      setStats({
        totalEmployees: employees.length,
        totalDepts: uniqueDepts.size,
        goalsSubmitted: submitted.length,
        goalsPending: pending.length,
        checkinCount: uniqueSubmitters.size,
        totalEligible: employees.length,
        overdueActions: 0
      });

      // Fetch Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, users(name), goals(title)')
        .order('created_at', { ascending: false })
        .limit(10);
      setActivities(logs || []);

      // FIX 2: Fetch locked goals
      const { data: locked } = await supabase
        .from('goals')
        .select('id, title, locked_at, employee_id, users!goals_employee_id_fkey(name), thrust_areas(name), goal_cycles(name)')
        .eq('status', 'locked')
        .order('locked_at', { ascending: false });
      setLockedGoals((locked || []) as any);

      // Fetch departments for heatmap
      const { data: depts } = await supabase.from('departments').select('*').order('name');
      // Fetch active cycle for heatmap
      const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).maybeSingle();
      
      let allGoals: any[] = [];
      let activeQuarter = 'Q2';
      if (activeCycle) {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*, goal_achievements(*)')
          .eq('cycle_id', activeCycle.id);
        allGoals = goalsData || [];
        
        // Dynamically get current quarter
        const currentDate = getCurrentDate();
        const windows = [
          { quarter: "Q1", start: activeCycle.q1_start, end: activeCycle.q1_end },
          { quarter: "Q2", start: activeCycle.q2_start, end: activeCycle.q2_end },
          { quarter: "Q3", start: activeCycle.q3_start, end: activeCycle.q3_end },
          { quarter: "Q4", start: activeCycle.q4_start, end: activeCycle.q4_end },
        ];
        for (const w of windows) {
          if (!w.start || !w.end) continue;
          const start = new Date(w.start.replace(/-/g, "/"));
          const end = new Date(w.end.replace(/-/g, "/"));
          end.setHours(23, 59, 59, 999);
          if (currentDate >= start && currentDate <= end) {
            activeQuarter = w.quarter;
            break;
          }
        }
      }

      // Group goals by employee
      const goalsByEmp: Record<string, any[]> = {};
      allGoals.forEach(g => {
        if (!goalsByEmp[g.employee_id]) {
          goalsByEmp[g.employee_id] = [];
        }
        goalsByEmp[g.employee_id].push(g);
      });

      // Construct heatmap items
      const deptList = (depts || []).map((d) => {
        const deptEmployees = (users || []).filter(
          (u) => u.role === 'employee' && u.department_id === d.id
        );
        
        const employeesWithScores = deptEmployees.map((emp) => {
          const empGoals = goalsByEmp[emp.id] || [];
          const hasLockedGoals = empGoals.some(g => g.status === 'locked');
          const achievements = empGoals.flatMap(g => g.goal_achievements || []).filter(a => a.quarter === activeQuarter);
          const hasAchievements = achievements.length > 0;
          
          let score: number | null = null;
          if (hasLockedGoals && hasAchievements) {
            score = computeWeightedAverage(empGoals, activeQuarter);
          }

          let colorStatus = 'gray'; // gray, green, yellow, red
          if (score !== null) {
            if (score >= 90) colorStatus = 'green';
            else if (score >= 70) colorStatus = 'yellow';
            else colorStatus = 'red';
          }

          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            score,
            colorStatus,
            initials: emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          };
        });

        return {
          id: d.id,
          name: d.name,
          employees: employeesWithScores,
          activeQuarter
        };
      });

      setHeatmapData(deptList);

    } catch (err) {
      console.error("Failed to load admin overview", err);
    }
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-overview:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_achievements' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // FIX 2: Unlock handler
  const handleUnlock = async (goal: LockedGoal) => {
    if (!user?.id) return;
    setUnlockingId(goal.id);
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: "approved", locked_at: null })
        .eq("id", goal.id);
      if (error) throw error;
      await logAudit({
        userId: user.id,
        goalId: goal.id,
        action: "UNLOCKED",
        entityType: "goal",
        oldValue: { status: "locked" },
        newValue: { status: "approved" },
      });
      toast.success("Goal unlocked. Employee can now edit and resubmit.");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlock goal");
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold text-[#1b1b24]">Admin Overview</h1>
        <p className="text-[#464555] text-sm">Performance Cycle 2025 · Q2 in progress</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-[#e4e1ee] shadow-sm flex items-start gap-4 bg-white">
          <div className="bg-indigo-100 rounded-full p-2.5 flex-shrink-0">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1b1b24]">{stats.totalEmployees}</p>
            <p className="text-xs text-[#777587]">Across {stats.totalDepts} departments</p>
          </div>
        </Card>

        <Card className="p-5 border-[#e4e1ee] shadow-sm flex items-start gap-4 bg-white">
          <div className="bg-green-100 rounded-full p-2.5 flex-shrink-0">
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-[#1b1b24]">{stats.goalsSubmitted}</p>
              {stats.goalsPending > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.goalsPending} pending</span>
              )}
            </div>
            <p className="text-xs text-[#777587]">Goals submitted</p>
          </div>
        </Card>

        <Card className="p-5 border-[#e4e1ee] shadow-sm flex items-start gap-4 bg-white">
          <div className="bg-blue-100 rounded-full p-2.5 flex-shrink-0">
            <CheckSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div className="w-full">
            <p className="text-2xl font-bold text-[#1b1b24]">{stats.checkinCount} of {stats.totalEligible}</p>
            <p className="text-xs text-[#777587]">employees submitted Q2</p>
            <div className="mt-2 h-1.5 w-full bg-indigo-50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full" 
                style={{ width: `${stats.totalEligible ? (stats.checkinCount / stats.totalEligible) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-[#e4e1ee] shadow-sm flex items-start gap-4 bg-white">
          <div className="bg-amber-100 rounded-full p-2.5 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.overdueActions > 0 ? 'text-red-600' : 'text-[#1b1b24]'}`}>
              {stats.overdueActions}
            </p>
            <p className="text-xs text-[#777587]">
              {stats.overdueActions > 0 ? 'Needs attention' : 'No overdue actions'}
            </p>
          </div>
        </Card>
      </div>

      {/* Cycle Status Card */}
      <Card className="bg-indigo-50/50 border-[#e4e1ee] shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-[#1b1b24]">Performance Cycle 2025</h2>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none text-xs flex items-center gap-1.5 px-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
            </Badge>
          </div>
          <div className="flex items-center text-xs font-medium text-[#464555] gap-4 whitespace-nowrap overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Goal Setting <span className="text-[#777587] ml-1 font-normal">Done</span></div>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <div className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Q1 <span className="text-[#777587] ml-1 font-normal">Done</span></div>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <div className="flex items-center gap-1.5 text-[#1b1b24] font-semibold"><span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span> Q2 <span className="text-indigo-600 ml-1 font-semibold">Active</span></div>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <div className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Q3 <span className="text-gray-400 ml-1 font-normal">Upcoming</span></div>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <div className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Q4 <span className="text-gray-400 ml-1 font-normal">Upcoming</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">Add New Cycle</Button>
          <Link 
            href="/admin/cycles" 
            className={cn(buttonVariants({ variant: "default" }), "bg-indigo-600 hover:bg-indigo-700 text-white")}
          >
            Manage Cycle
          </Link>
        </div>
      </Card>

      {/* Goal Progress Heatmap */}
      <Card className="border-[#e4e1ee] shadow-sm bg-white overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1b1b24]">Goal Progress Heatmap</h2>
            <p className="text-xs text-[#777587]">Department-level overview of employee weighted scores for the active quarter</p>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              <span className="text-[#464555]">On Track (≥90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-[#464555]">Needs Attention (70-89%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-500" />
              <span className="text-[#464555]">Off Track (&lt;70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gray-100 border border-gray-200" />
              <span className="text-[#464555]">No Data</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heatmapData.map((dept) => {
            const hasEmployees = dept.employees.length > 0;
            return (
              <div key={dept.id} className="border border-border rounded-xl p-4 bg-surface-container-lowest">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-sm text-[#1b1b24] truncate max-w-[180px]">{dept.name}</span>
                  <span className="text-xs text-[#777587] font-medium">{dept.employees.length} Employee{dept.employees.length !== 1 ? 's' : ''}</span>
                </div>
                {hasEmployees ? (
                  <div className="grid grid-cols-7 gap-2">
                    {dept.employees.map((emp: any) => {
                      let cellClass = "bg-gray-100 border border-gray-200 text-gray-400";
                      if (emp.colorStatus === 'green') cellClass = "bg-emerald-500 text-white font-bold";
                      else if (emp.colorStatus === 'yellow') cellClass = "bg-amber-500 text-white font-bold";
                      else if (emp.colorStatus === 'red') cellClass = "bg-rose-500 text-white font-bold";

                      const tooltipText = `${emp.name} (${emp.email})\nScore: ${emp.score !== null ? `${Math.round(emp.score)}%` : 'No locked goals / achievements yet'}`;

                      return (
                        <div
                          key={emp.id}
                          className={cn(
                            "relative aspect-square flex items-center justify-center rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 hover:shadow-md",
                            cellClass
                          )}
                          title={tooltipText}
                        >
                          {emp.initials}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-xs text-text-muted italic">
                    No employees assigned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* FIX 2: Locked Goals section */}
      <Card className="border-[#e4e1ee] shadow-sm bg-white overflow-hidden">
        <div className="p-5 border-b border-[#f0ecf9] flex items-center gap-3">
          <div className="bg-orange-100 rounded-lg p-2">
            <Shield className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1b1b24]">Locked Goals</h2>
            <p className="text-xs text-[#777587]">Goals locked after manager approval — unlock to allow employee edits</p>
          </div>
          {lockedGoals.length > 0 && (
            <span className="ml-auto rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
              {lockedGoals.length} locked
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-[#f0ecf9]">
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600">Employee</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600">Goal Title</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600">Thrust Area</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600">Locked At</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf9]">
              {lockedGoals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-[#777587]">
                    No locked goals. All goals are accessible.
                  </td>
                </tr>
              ) : (
                lockedGoals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 text-sm font-medium text-[#1b1b24]">
                      {(goal as any).users?.name ?? "—"}
                    </td>
                    <td className="py-3 px-5 text-sm text-[#464555] max-w-[220px] truncate">
                      {goal.title}
                    </td>
                    <td className="py-3 px-5">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {(goal as any).thrust_areas?.name ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-[#777587]">
                      {goal.locked_at
                        ? new Date(goal.locked_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-3 px-5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={unlockingId === goal.id}
                        onClick={() => handleUnlock(goal)}
                        className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 flex items-center gap-1"
                      >
                        <Unlock className="h-3 w-3" />
                        {unlockingId === goal.id ? "Unlocking..." : "Unlock"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Completion Table */}
        <Card className="lg:col-span-2 border-[#e4e1ee] shadow-sm bg-white overflow-hidden">
          <div className="p-5 border-b border-[#f0ecf9]">
            <h2 className="font-semibold text-[#1b1b24]">Q2 Completion by Department</h2>
          </div>
          <div className="overflow-x-auto p-5">
            <p className="text-sm text-[#777587] italic">Table data requires more complex joins to be displayed fully. Placeholder for now.</p>
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-[#e4e1ee] shadow-sm bg-white flex flex-col h-[400px]">
          <div className="p-5 border-b border-[#f0ecf9] flex justify-between items-center shrink-0">
            <h2 className="font-semibold text-[#1b1b24]">Recent Activity</h2>
            <Link href="/admin/audit" className="text-xs text-indigo-600 hover:underline font-semibold">View All</Link>
          </div>
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-[#777587]">No recent activity.</p>
            ) : (
              activities.map((log) => {
                const isGreen = log.action === 'APPROVED';
                const isRed = log.action === 'RETURNED' || log.action === 'UNLOCKED';
                const isAmber = log.action === 'MODIFIED';
                const color = isGreen ? 'bg-green-500' : isRed ? 'bg-red-500' : isAmber ? 'bg-amber-500' : 'bg-blue-500';

                return (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                    <div className="flex-1">
                      <p className="text-[#1b1b24]">
                        <span className="font-semibold">{log.users?.name || 'System'}</span> 
                        <span className="text-[#464555] mx-1">
                          {log.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        {log.goals?.title && <span className="italic">&quot;{log.goals.title}&quot;</span>}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#777587] shrink-0">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
