"use client";

import { useEffect, useState } from "react";
import { Share2, Info, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SharedGoals() {
  const supabase = createClient();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    loadSharedGoals();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-shared-goals:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => { loadSharedGoals(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { loadSharedGoals(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Shared Goals</h1>
          <p className="text-[#464555] text-sm mt-1 max-w-xl">
            Push departmental KPIs to multiple employees. Recipients can only adjust weightage.
          </p>
        </div>
        <Button className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Push New Shared Goal
        </Button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Shared goals have locked titles and targets. Recipients can only adjust their weightage allocation. Achievement updates by the primary owner sync to all linked employees.
        </p>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Share2 className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-[#1b1b24]">No shared goals yet</h2>
          <p className="text-[#777587] text-sm mt-1 mb-6">Push a departmental KPI to your team</p>
          <Button className="bg-[#4f46e5] hover:bg-indigo-700 text-white">Push First Shared Goal</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => (
            <Card key={goal.id} className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#f0ecf9] flex justify-between items-center">
                <div className="flex flex-col items-start gap-2">
                  <Badge 
                    className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: goal.thrust_areas?.bg_color || '#e0e7ff', color: goal.thrust_areas?.color || '#4f46e5' }}
                  >
                    {goal.thrust_areas?.name}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[#1b1b24]">{goal.title}</h3>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-medium px-3 py-1">
                    Shared with {goal.linked?.length || 0} employees
                  </Badge>
                  <Button variant="ghost" className="text-indigo-600 font-medium text-sm">View Details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
