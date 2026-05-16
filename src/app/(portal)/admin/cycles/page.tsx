"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CycleManagement() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1b1b24]">Cycle Management</h1>
        <Button className="bg-[#4f46e5] hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create New Cycle
        </Button>
      </div>

      {/* Active Cycle Card */}
      <Card className="bg-white border-l-4 border-l-[#4f46e5] border-[#e4e1ee] shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#1b1b24]">Performance Cycle 2025</h2>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-xs flex items-center gap-1.5 px-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-indigo-600 font-medium text-sm">Edit Cycle</Button>
            <Button variant="ghost" className="text-red-600 font-medium text-sm hover:bg-red-50 hover:text-red-700">Close Cycle</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#f0ecf9]">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase text-[#777587]">Phase</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase text-[#777587]">Opens</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase text-[#777587]">Closes</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase text-[#777587]">Status</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase text-[#777587]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-[#f0ecf9] hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-[#1b1b24]">Goal Setting</td>
                <td className="py-3 px-4 text-[#464555]">May 1</td>
                <td className="py-3 px-4 text-[#464555]">Jun 30</td>
                <td className="py-3 px-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-2.5">✓ Done</Badge></td>
                <td className="py-3 px-4 text-[#777587]">—</td>
              </tr>
              <tr className="border-b border-[#f0ecf9] hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-[#1b1b24]">Q1 Check-in</td>
                <td className="py-3 px-4 text-[#464555]">Jul 1</td>
                <td className="py-3 px-4 text-[#464555]">Sep 30</td>
                <td className="py-3 px-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-2.5">✓ Done</Badge></td>
                <td className="py-3 px-4 text-[#777587]">—</td>
              </tr>
              <tr className="border-b border-[#f0ecf9] hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-[#1b1b24]">Q2 Check-in</td>
                <td className="py-3 px-4 text-[#464555]">Oct 1</td>
                <td className="py-3 px-4 text-[#464555]">Dec 31</td>
                <td className="py-3 px-4">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 px-2.5 gap-1.5 flex w-max items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Active
                  </Badge>
                </td>
                <td className="py-3 px-4"><span className="text-indigo-600 font-medium cursor-pointer hover:underline text-xs">Extend dates</span></td>
              </tr>
              <tr className="border-b border-[#f0ecf9] hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-[#1b1b24]">Q3 Check-in</td>
                <td className="py-3 px-4 text-[#464555]">Jan 1</td>
                <td className="py-3 px-4 text-[#464555]">Mar 31</td>
                <td className="py-3 px-4"><Badge variant="outline" className="text-gray-500 bg-gray-50 px-2.5">○ Upcoming</Badge></td>
                <td className="py-3 px-4"><span className="text-indigo-600 font-medium cursor-pointer hover:underline text-xs">Edit</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-[#1b1b24]">Q4 / Annual</td>
                <td className="py-3 px-4 text-[#464555]">Mar 1</td>
                <td className="py-3 px-4 text-[#464555]">Apr 30</td>
                <td className="py-3 px-4"><Badge variant="outline" className="text-gray-500 bg-gray-50 px-2.5">○ Upcoming</Badge></td>
                <td className="py-3 px-4"><span className="text-indigo-600 font-medium cursor-pointer hover:underline text-xs">Edit</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Past Cycles Table */}
      <Card className="bg-white border-[#e4e1ee] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#f0ecf9]">
          <h2 className="font-semibold text-[#1b1b24]">Previous Cycles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ecf9]">
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Cycle Name</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Year</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Employees</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Avg Score</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Status</th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase text-[#777587]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#f0ecf9]">
              <tr className="hover:bg-gray-50/50">
                <td className="py-4 px-5 font-semibold text-[#1b1b24]">Performance Cycle 2024</td>
                <td className="py-4 px-5 text-[#464555]">2024</td>
                <td className="py-4 px-5 text-[#464555]">4</td>
                <td className="py-4 px-5 font-bold text-green-700">81%</td>
                <td className="py-4 px-5"><Badge variant="outline" className="bg-gray-100 text-gray-600 border-none">Closed</Badge></td>
                <td className="py-4 px-5"><span className="text-indigo-600 font-medium cursor-pointer hover:underline text-xs">View Report</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-4 px-5 font-semibold text-[#1b1b24]">Performance Cycle 2023</td>
                <td className="py-4 px-5 text-[#464555]">2023</td>
                <td className="py-4 px-5 text-[#464555]">3</td>
                <td className="py-4 px-5 font-bold text-indigo-700">76%</td>
                <td className="py-4 px-5"><Badge variant="outline" className="bg-gray-100 text-gray-600 border-none">Closed</Badge></td>
                <td className="py-4 px-5"><span className="text-indigo-600 font-medium cursor-pointer hover:underline text-xs">View Report</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
