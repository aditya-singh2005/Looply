"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function loadReports() {
      // Fetch users and their goals
      const { data: users } = await supabase
        .from('users')
        .select(`
          id, name, email,
          departments(name),
          goals(
            id, title, weightage, uom_type,
            target_value, target_date, status,
            thrust_areas(name, color),
            goal_achievements(
              quarter, actual_value, actual_date,
              status, submitted_at
            )
          )
        `)
        .eq('role', 'employee');
      setData(users || []);
    }
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Reports</h1>
          <p className="text-[#464555] text-sm mt-1">Performance Cycle 2025 · Q2 in progress</p>
        </div>
        <Button className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <button className="px-4 py-2 text-indigo-600 border-b-2 border-indigo-600 font-medium text-sm">Achievement Report</button>
        <button className="px-4 py-2 text-gray-500 font-medium text-sm">Completion Dashboard</button>
      </div>

      <Card className="bg-white border-[#e4e1ee] shadow-sm p-4">
        <p className="text-sm italic text-gray-500">Filter bar placeholder (Department, Employee, Quarter)...</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Overall Avg Score</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-indigo-600">74%</span>
            <span className="text-xs text-green-600 font-bold mb-1">↑ 6% vs Q1</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all active employees</p>
        </Card>
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Goal Completion Rate</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-gray-800">67%</span>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center relative">
               <svg className="absolute w-full h-full -rotate-90 text-indigo-500">
                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="125" strokeDashoffset="41" />
               </svg>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Check-in Submission Rate</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-red-500">25%</span>
            <span className="text-sm text-gray-800 font-medium mb-1">1 of 4 employees</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">3 employees haven't submitted yet</p>
        </Card>
      </div>

      <Card className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">Employee</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600">Dept</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600">Goal Title</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600">Target</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Q1</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Q2</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf9]">
              {data.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 border-l-4 border-transparent hover:border-indigo-500 transition-colors">
                  <td className="py-4 px-4 sticky left-0 bg-white group-hover:bg-gray-50">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="py-4 px-4"><Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-100">{user.departments?.name}</Badge></td>
                  <td className="py-4 px-4 text-sm text-gray-700 max-w-[200px] truncate">
                    {user.goals?.[0]?.title || <span className="italic text-gray-400">No goals set</span>}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">{user.goals?.[0]?.target_value || '—'}</td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm text-gray-700 mb-1">100</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">100%</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <p className="text-sm text-gray-700 mb-1">80</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">80%</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700">90%</span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 text-sm">Loading reports...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
