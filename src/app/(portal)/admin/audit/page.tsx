"use client";

import { useEffect, useState, useMemo } from "react";
import { Shield, Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ACTION_OPTIONS = [
  "All",
  "CREATED",
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
  "MODIFIED",
  "UNLOCKED",
  "CHECKIN_SUBMITTED",
  "SHARED_GOAL_PUSHED",
  "BATCH_SUBMITTED",
  "SHARED_GOAL_ACHIEVEMENT_SYNCED",
];

const ROLE_OPTIONS = ["All", "employee", "manager", "admin"];

export default function AuditLog() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX 4: Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*, users(id, name, role, email, profile_pic), goals(id, title)')
          .order('created_at', { ascending: false })
          .limit(500);
        setLogs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();

    const channel = supabase
      .channel('admin-audit-logs:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { loadLogs(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // FIX 4: Apply all filters client-side with useMemo
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date range
      if (fromDate) {
        const logDate = new Date(log.created_at);
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (logDate < from) return false;
      }
      if (toDate) {
        const logDate = new Date(log.created_at);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (logDate > to) return false;
      }
      // Action
      if (actionFilter !== "All" && log.action !== actionFilter) return false;
      // Role
      if (roleFilter !== "All" && log.users?.role !== roleFilter) return false;
      // User name search
      if (userSearch.trim()) {
        const name = (log.users?.name ?? "").toLowerCase();
        if (!name.includes(userSearch.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, fromDate, toDate, actionFilter, roleFilter, userSearch]);

  // FIX 4: Export CSV using filtered logs
  const handleExportCsv = () => {
    try {
      const headers = ["Timestamp", "User", "Role", "Goal Title", "Action", "Old Value", "New Value"];
      const rows = [headers.join(",")];
      filteredLogs.forEach((log) => {
        const ts = new Date(log.created_at).toLocaleString("en-IN");
        const user = `"${(log.users?.name ?? "System").replace(/"/g, '""')}"`;
        const role = log.users?.role ?? "system";
        const goalTitle = `"${(log.goals?.title ?? "").replace(/"/g, '""')}"`;
        const action = log.action;
        const oldVal = `"${JSON.stringify(log.old_value ?? {}).replace(/"/g, '""')}"`;
        const newVal = `"${JSON.stringify(log.new_value ?? {}).replace(/"/g, '""')}"`;
        rows.push([ts, user, role, goalTitle, action, oldVal, newVal].join(","));
      });
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredLogs.length} audit entries`);
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'bg-blue-100 text-blue-700';
      case 'SUBMITTED':
      case 'BATCH_SUBMITTED': return 'bg-indigo-100 text-indigo-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'RETURNED': return 'bg-red-100 text-red-700';
      case 'MODIFIED': return 'bg-amber-100 text-amber-700';
      case 'UNLOCKED': return 'bg-orange-100 text-orange-700';
      case 'CHECKIN_SUBMITTED': return 'bg-teal-100 text-teal-700';
      case 'SHARED_GOAL_PUSHED':
      case 'SHARED_GOAL_ACHIEVEMENT_SYNCED': return 'bg-purple-100 text-purple-700';
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
            <p className="text-[#464555] text-sm mt-0.5">
              All changes to goals are recorded here.{" "}
              <span className="font-medium text-indigo-600">{filteredLogs.length} entries shown</span>
            </p>
          </div>
        </div>
        {/* FIX 4: Export CSV with real onClick */}
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={filteredLogs.length === 0}
          className="text-[#464555] bg-white border-[#e4e1ee] flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* FIX 4: Real filter controls */}
      <Card className="bg-white border-[#e4e1ee] shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-sm w-40"
            />
          </div>

          {/* Action filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Role filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-[#1b1b24] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r === "All" ? "All Roles" : r}</option>
              ))}
            </select>
          </div>

          {/* User name search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User Name</label>
            <Input
              type="text"
              placeholder="Search by name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Reset */}
          {(fromDate || toDate || actionFilter !== "All" || roleFilter !== "All" || userSearch) && (
            <button
              type="button"
              onClick={() => { setFromDate(""); setToDate(""); setActionFilter("All"); setRoleFilter("All"); setUserSearch(""); }}
              className="text-xs font-medium text-indigo-600 hover:underline self-end pb-2"
            >
              Reset filters
            </button>
          )}
        </div>
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
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-base font-semibold text-[#1b1b24]">No audit entries found</h2>
                    <p className="text-sm text-[#777587] mt-1">Try adjusting the filters above.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors h-[52px]">
                    <td className="py-2 px-5">
                      <p className="text-[13px] text-gray-700">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-[12px] font-mono text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          {log.users?.profile_pic && <AvatarImage src={log.users.profile_pic} alt={log.users.name || "User"} />}
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
