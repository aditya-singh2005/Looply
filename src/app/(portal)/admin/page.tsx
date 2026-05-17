"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Target, 
  CheckSquare, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ScorePill({ score }: { score: number }) {
  if (score >= 90) return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{score}%</span>;
  if (score >= 70) return <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{score}%</span>;
  if (score >= 50) return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{score}%</span>;
  return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{score}%</span>;
}

export default function AdminOverview() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepts: 0,
    goalsSubmitted: 0,
    goalsPending: 0,
    checkinCount: 0,
    totalEligible: 0,
    overdueActions: 0
  });
  const [deptData, setDeptData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Employees & Departments
        const { data: users } = await supabase.from('users').select('id, role, department_id');
        const employees = users?.filter(u => u.role === 'employee') || [];
        const uniqueDepts = new Set(employees.map(e => e.department_id).filter(Boolean));
        
        // 2. Goals Submitted
        const { data: goals } = await supabase.from('goals').select('id, status');
        const submitted = goals?.filter(g => ['submitted', 'locked', 'approved'].includes(g.status)) || [];
        const pending = goals?.filter(g => g.status === 'submitted' || g.status === 'returned') || [];

        // 3. Check-ins
        const { data: achievements } = await supabase
          .from('goal_achievements')
          .select('employee_id, submitted_at')
          .eq('quarter', 'Q2')
          .not('submitted_at', 'is', null);
        
        const uniqueSubmitters = new Set(achievements?.map(a => a.employee_id));

        setStats({
          totalEmployees: employees.length,
          totalDepts: uniqueDepts.size,
          goalsSubmitted: submitted.length,
          goalsPending: pending.length,
          checkinCount: uniqueSubmitters.size,
          totalEligible: employees.length,
          overdueActions: 0 // Mock for now
        });

        // Fetch Audit Logs
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('*, users(name), goals(title)')
          .order('created_at', { ascending: false })
          .limit(10);
        
        setActivities(logs || []);

      } catch (err) {
        console.error("Failed to load admin overview", err);
      }
    }
    loadData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-overview:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_achievements' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { loadData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold text-[#1b1b24]">Admin Overview</h1>
        <p className="text-[#464555] text-sm">Performance Cycle 2025 · Q2 in progress</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="p-5 border-[#e4e1ee] shadow-sm flex items-start gap-4 bg-white">
          <div className="bg-indigo-100 rounded-full p-2.5 flex-shrink-0">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1b1b24]">{stats.totalEmployees}</p>
            <p className="text-xs text-[#777587]">Across {stats.totalDepts} departments</p>
          </div>
        </Card>

        {/* Card 2 */}
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

        {/* Card 3 */}
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

        {/* Card 4 */}
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
                        {log.goals?.title && <span className="italic">"{log.goals.title}"</span>}
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
