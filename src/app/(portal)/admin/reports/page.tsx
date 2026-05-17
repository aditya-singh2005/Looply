"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { computeScore } from "@/lib/utils/score";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-gray-400">—</span>;
  if (score >= 90) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{score}%</span>;
  if (score >= 70) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{score}%</span>;
  if (score >= 50) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{score}%</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{score}%</span>;
}

export default function Reports() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"achievement" | "completion">("achievement");
  const [isExporting, setIsExporting] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [filterQuarter, setFilterQuarter] = useState("All");

  useEffect(() => {
    async function loadReports() {
      const { data: users } = await supabase
        .from('users')
        .select(`
          id, name, email,
          departments(name),
          goals!employee_id(
            id, title, weightage, uom_type,
            target_value, target_date, status,
            thrust_areas(name, color),
            goal_achievements(
              quarter, actual_value, actual_date,
              status, submitted_at, score
            )
          )
        `)
        .eq('role', 'employee');
      setData(users || []);
    }
    loadReports();
  }, [supabase]);

  const depts = useMemo(() => {
    const d = new Set<string>();
    data.forEach(u => { if (u.departments?.name) d.add(u.departments.name) });
    return Array.from(d).sort();
  }, [data]);

  const stats = useMemo(() => {
    let totalGoals = 0;
    let lockedGoals = 0;
    let sumScore = 0;
    let scoreCount = 0;
    const usersWithCheckin = new Set<string>();

    data.forEach(user => {
      user.goals?.forEach((goal: any) => {
        totalGoals++;
        if (goal.status === 'locked') lockedGoals++;
        
        goal.goal_achievements?.forEach((ach: any) => {
          if (ach.submitted_at) usersWithCheckin.add(user.id);
          const score = ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, ach.actual_value, ach.actual_date);
          if (score !== null) {
            sumScore += score;
            scoreCount++;
          }
        });
      });
    });

    const avgScore = scoreCount > 0 ? Math.round(sumScore / scoreCount) : 0;
    const completionRate = totalGoals > 0 ? Math.round((lockedGoals / totalGoals) * 100) : 0;
    const checkinRate = data.length > 0 ? Math.round((usersWithCheckin.size / data.length) * 100) : 0;

    return { avgScore, completionRate, checkinRate, usersWithCheckinSize: usersWithCheckin.size, totalUsers: data.length };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(u => filterDept === 'All' || u.departments?.name === filterDept);
  }, [data, filterDept]);

  const exportCsv = () => {
    setIsExporting(true);
    try {
      const headers = ["Employee", "Email", "Department", "Goal Title", "UoM", "Target", "Weightage", "Q1 Actual", "Q1 Score%", "Q2 Actual", "Q2 Score%", "Annual Score%"];
      const rows = [headers.join(",")];
      
      filteredData.forEach(user => {
        const empName = `"${user.name}"`;
        const empEmail = `"${user.email}"`;
        const empDept = `"${user.departments?.name || ''}"`;
        
        if (!user.goals || user.goals.length === 0) {
          rows.push([empName, empEmail, empDept, "No goals", "", "", "", "", "", "", "", ""].join(","));
          return;
        }

        user.goals.forEach((goal: any) => {
          const title = `"${(goal.title || '').replace(/"/g, '""')}"`;
          const uom = goal.uom_type;
          const target = goal.uom_type === 'timeline' ? goal.target_date : goal.target_value;
          const weight = goal.weightage;
          
          const q1Ach = goal.goal_achievements?.find((a: any) => a.quarter === 'Q1');
          const q1Actual = q1Ach ? (goal.uom_type === 'timeline' ? q1Ach.actual_date : q1Ach.actual_value) : '';
          const q1Score = q1Ach ? (q1Ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, q1Ach.actual_value, q1Ach.actual_date)) : '';
          
          const q2Ach = goal.goal_achievements?.find((a: any) => a.quarter === 'Q2');
          const q2Actual = q2Ach ? (goal.uom_type === 'timeline' ? q2Ach.actual_date : q2Ach.actual_value) : '';
          const q2Score = q2Ach ? (q2Ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, q2Ach.actual_value, q2Ach.actual_date)) : '';
          
          let sum = 0; let count = 0;
          goal.goal_achievements?.forEach((ach: any) => {
            const s = ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, ach.actual_value, ach.actual_date);
            if (s !== null) { sum += s; count++; }
          });
          const annual = count > 0 ? Math.round(sum / count) : '';
          
          rows.push([empName, empEmail, empDept, title, uom, target, weight, q1Actual, q1Score, q2Actual, q2Score, annual].join(","));
        });
      });
      
      const csvString = rows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "achievement-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Reports</h1>
          <p className="text-[#464555] text-sm mt-1">Performance Cycle 2025 · Q2 in progress</p>
        </div>
        {activeTab === "achievement" && (
          <Button onClick={exportCsv} disabled={isExporting || filteredData.length === 0} className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Exporting..." : "Export Report"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Overall Avg Score</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-indigo-600">{stats.avgScore}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all active employees</p>
        </Card>
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Goal Completion Rate</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-gray-800">{stats.completionRate}%</span>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center relative">
               <svg className="absolute w-full h-full -rotate-90 text-indigo-500">
                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="125" strokeDashoffset={125 - (125 * stats.completionRate / 100)} />
               </svg>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-[#e4e1ee] shadow-sm bg-white">
          <p className="text-sm font-semibold text-gray-600 mb-2">Check-in Submission Rate</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-red-500">{stats.checkinRate}%</span>
            <span className="text-sm text-gray-800 font-medium mb-1">{stats.usersWithCheckinSize} of {stats.totalUsers} employees</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.totalUsers - stats.usersWithCheckinSize} employees haven't submitted yet</p>
        </Card>
      </div>

      <Card className="bg-white border-[#e4e1ee] shadow-sm p-4 flex gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)}
              className="border border-gray-200 rounded-md text-sm px-3 py-1.5 outline-none focus:border-indigo-500 bg-white min-w-[200px]"
            >
              <option value="All">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quarter Filter</label>
            <select 
              value={filterQuarter} 
              onChange={e => setFilterQuarter(e.target.value)}
              className="border border-gray-200 rounded-md text-sm px-3 py-1.5 outline-none focus:border-indigo-500 bg-white min-w-[150px]"
            >
              <option value="All">All Quarters</option>
              <option value="Q1">Q1 Only</option>
              <option value="Q2">Q2 Only</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex gap-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab("achievement")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'achievement' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Achievement Report
        </button>
        <button 
          onClick={() => setActiveTab("completion")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'completion' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Completion Dashboard
        </button>
      </div>

      <Card className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "achievement" ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 w-[20%]">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 w-[10%]">Dept</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 w-[30%]">Goal Title</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 w-[10%]">Target</th>
                  {(filterQuarter === 'All' || filterQuarter === 'Q1') && <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center w-[10%]">Q1</th>}
                  {(filterQuarter === 'All' || filterQuarter === 'Q2') && <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center w-[10%]">Q2</th>}
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center w-[10%]">Annual</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500 text-sm">No employees match the selected department.</td></tr>
                ) : (
                  filteredData.map(user => {
                    if (!user.goals || user.goals.length === 0) {
                      const colSpanCount = 2 + (filterQuarter === 'All' ? 2 : 1) + 1;
                      return (
                        <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50">
                           <td className="py-4 px-4 align-top sticky left-0 bg-white">
                              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                           </td>
                           <td className="py-4 px-4 align-top"><Badge variant="outline" className="text-xs font-normal bg-gray-100">{user.departments?.name || '—'}</Badge></td>
                           <td colSpan={colSpanCount} className="py-4 px-4 text-sm text-gray-400 italic">No goals set</td>
                        </tr>
                      );
                    }
                    
                    return user.goals.map((goal: any, index: number) => {
                      const isFirst = index === 0;
                      const q1Ach = goal.goal_achievements?.find((a: any) => a.quarter === 'Q1');
                      const q1Actual = q1Ach ? (goal.uom_type === 'timeline' ? q1Ach.actual_date : q1Ach.actual_value) : null;
                      const q1Score = q1Ach ? (q1Ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, q1Ach.actual_value, q1Ach.actual_date)) : null;
                  
                      const q2Ach = goal.goal_achievements?.find((a: any) => a.quarter === 'Q2');
                      const q2Actual = q2Ach ? (goal.uom_type === 'timeline' ? q2Ach.actual_date : q2Ach.actual_value) : null;
                      const q2Score = q2Ach ? (q2Ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, q2Ach.actual_value, q2Ach.actual_date)) : null;
                  
                      let sum = 0; let count = 0;
                      goal.goal_achievements?.forEach((ach: any) => {
                        const s = ach.score ?? computeScore(goal.uom_type, goal.target_value, goal.target_date, ach.actual_value, ach.actual_date);
                        if (s !== null) { sum += s; count++; }
                      });
                      const annual = count > 0 ? Math.round(sum / count) : null;
                  
                      return (
                        <tr key={goal.id} className={`${isFirst ? 'border-t border-gray-200' : ''} hover:bg-gray-50`}>
                          <td className="py-3 px-4 align-top sticky left-0 bg-white group-hover:bg-gray-50">
                            {isFirst ? (
                              <>
                                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 align-top">
                            {isFirst ? <Badge variant="outline" className="text-xs font-normal bg-gray-100">{user.departments?.name || '—'}</Badge> : null}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 max-w-[300px] truncate">
                            {goal.title}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            {goal.uom_type === 'timeline' ? goal.target_date || '—' : goal.target_value || '—'}
                          </td>
                          {(filterQuarter === 'All' || filterQuarter === 'Q1') && (
                            <td className="py-3 px-4 text-center">
                              {q1Ach ? (
                                 <>
                                   <p className="text-sm text-gray-700 mb-1">{q1Actual}</p>
                                   <ScoreBadge score={q1Score} />
                                 </>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                          )}
                          {(filterQuarter === 'All' || filterQuarter === 'Q2') && (
                            <td className="py-3 px-4 text-center">
                              {q2Ach ? (
                                 <>
                                   <p className="text-sm text-gray-700 mb-1">{q2Actual}</p>
                                   <ScoreBadge score={q2Score} />
                                 </>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                          )}
                          <td className="py-3 px-4 text-center">
                            <ScoreBadge score={annual} />
                          </td>
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600">Dept</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Goals Locked</th>
                  {(filterQuarter === 'All' || filterQuarter === 'Q1') && <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Q1 Submitted</th>}
                  {(filterQuarter === 'All' || filterQuarter === 'Q2') && <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Q2 Submitted</th>}
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 text-center">Overall Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No data matching filters</td></tr>
                ) : (
                  filteredData.map(user => {
                     const goalsLocked = user.goals?.filter((g: any) => g.status === 'locked').length || 0;
                     let q1Sub = false; let q2Sub = false;
                     user.goals?.forEach((g: any) => {
                       g.goal_achievements?.forEach((ach: any) => {
                         if (ach.quarter === 'Q1' && ach.submitted_at) q1Sub = true;
                         if (ach.quarter === 'Q2' && ach.submitted_at) q2Sub = true;
                       });
                     });
                     
                     const statuses = [];
                     if (filterQuarter === 'All' || filterQuarter === 'Q1') statuses.push(q1Sub);
                     if (filterQuarter === 'All' || filterQuarter === 'Q2') statuses.push(q2Sub);
                     
                     let overall = 'Pending';
                     if (statuses.length > 0 && statuses.every(s => s)) overall = 'Complete';
                     else if (statuses.some(s => s)) overall = 'Partial';
                     
                     return (
                        <tr key={user.id} className="hover:bg-gray-50 border-t border-gray-100">
                          <td className="py-3 px-4">
                             <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                             <p className="text-xs text-gray-500">{user.email}</p>
                          </td>
                          <td className="py-3 px-4"><Badge variant="outline" className="bg-gray-100 font-normal">{user.departments?.name || '—'}</Badge></td>
                          <td className="py-3 px-4 text-center font-medium">{goalsLocked}</td>
                          {(filterQuarter === 'All' || filterQuarter === 'Q1') && (
                            <td className="py-3 px-4 text-center">
                               {q1Sub ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                            </td>
                          )}
                          {(filterQuarter === 'All' || filterQuarter === 'Q2') && (
                            <td className="py-3 px-4 text-center">
                               {q2Sub ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                            </td>
                          )}
                          <td className="py-3 px-4 text-center">
                             {overall === 'Complete' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5">Complete</Badge>}
                             {overall === 'Partial' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-0.5">Partial</Badge>}
                             {overall === 'Pending' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0.5">Pending</Badge>}
                          </td>
                        </tr>
                     );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
