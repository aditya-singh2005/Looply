"use client";

import { useEffect, useState } from "react";
import { Shield, Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AuditLog() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*, users(id, name, role), goals(id, title)')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-audit-logs:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { loadLogs(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'bg-blue-100 text-blue-700';
      case 'SUBMITTED': return 'bg-indigo-100 text-indigo-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'RETURNED': return 'bg-red-100 text-red-700';
      case 'MODIFIED': return 'bg-amber-100 text-amber-700';
      case 'UNLOCKED': return 'bg-orange-100 text-orange-700';
      case 'CHECKIN_SUBMITTED': return 'bg-teal-100 text-teal-700';
      case 'SHARED_GOAL_PUSHED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-2.5 rounded-xl">
            <Shield className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Audit Log</h1>
            <p className="text-[#464555] text-sm mt-0.5">All changes to goals after lock date are recorded here.</p>
          </div>
        </div>
        <Button variant="outline" className="text-[#464555] bg-white border-[#e4e1ee] flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <Card className="bg-white border-[#e4e1ee] shadow-sm p-4 flex gap-4 items-center">
        <p className="text-sm italic text-gray-500">Filter bar placeholder (Date, User, Action, Role)...</p>
      </Card>

      <Card className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-[#f0ecf9]">
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[14%]">Timestamp</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[16%]">User</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[10%]">Role</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[18%]">Goal</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[12%]">Action</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-gray-600 w-[30%]">Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf9]">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-gray-500">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-base font-semibold text-[#1b1b24]">No audit entries found</h2>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors h-[52px]">
                    <td className="py-2 px-5">
                      <p className="text-[13px] text-gray-700">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-[12px] font-mono text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                            {log.users?.name?.substring(0, 2).toUpperCase() || 'SY'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[14px] text-gray-700">{log.users?.name || 'System'}</span>
                      </div>
                    </td>
                    <td className="py-2 px-5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleColor(log.users?.role)}`}>
                        {log.users?.role || 'system'}
                      </span>
                    </td>
                    <td className="py-2 px-5">
                      <span className="text-[14px] text-gray-700 truncate block max-w-[200px]">
                        {log.goals?.title || <span className="text-gray-400 italic">— System</span>}
                      </span>
                    </td>
                    <td className="py-2 px-5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-5">
                      {log.new_value || log.old_value ? (
                        <div className="text-[12px] font-mono text-gray-600 truncate max-w-[300px]">
                          {JSON.stringify(log.old_value)} → {JSON.stringify(log.new_value)}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
