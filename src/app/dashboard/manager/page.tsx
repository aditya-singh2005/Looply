'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Users, 
  CheckSquare, 
  FileText, 
  TrendingUp,
  MoreVertical,
  Plus,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner'

export default function ManagerDashboard() {
  const [team, setTeam] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [stats, setStats] = useState({
    teamSize: 0,
    pendingTasks: 0,
    leaveApprovals: 0
  })
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: teamRes } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', user.id)
      
      const { data: taskRes } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_by', user.id)
      
      const { data: leaveRes } = await supabase
        .from('leave_requests')
        .select('*, users!user_id(name)')
        .eq('manager_id', user.id)
        .eq('status', 'pending')

      if (teamRes) setTeam(teamRes)
      if (leaveRes) setLeaves(leaveRes)

      setStats({
        teamSize: teamRes?.length || 0,
        pendingTasks: taskRes?.filter(t => t.status !== 'done').length || 0,
        leaveApprovals: leaveRes?.length || 0
      })
    }
    fetchData()
  }, [supabase])

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Action failed')
    } else {
      toast.success(`Leave request ${status}`)
      setLeaves(leaves.filter(l => l.id !== id))
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manager Overview</h1>
          <p className="text-slate-500 mt-1">Manage your team's performance and requests.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Team Members" value={stats.teamSize.toString()} icon={Users} color="blue" />
        <StatCard title="Total Tasks" value={stats.pendingTasks.toString()} icon={CheckSquare} color="indigo" />
        <StatCard title="Leave Requests" value={stats.leaveApprovals.toString()} icon={FileText} color="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Team List */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Team Members</h3>
            <button className="text-sm font-semibold text-blue-600">View Directory</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-4 font-semibold text-slate-500 text-sm">Employee</th>
                  <th className="pb-4 font-semibold text-slate-500 text-sm">Department</th>
                  <th className="pb-4 font-semibold text-slate-500 text-sm">Status</th>
                  <th className="pb-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {team.map((member) => (
                  <tr key={member.id} className="group">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-slate-600">{member.department || 'N/A'}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-600">Active</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-8">Pending Leaves</h3>
          <div className="space-y-6">
            {leaves.length > 0 ? leaves.map((leave) => (
              <div key={leave.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-800">{leave.users?.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{leave.start_date} to {leave.end_date}</p>
                  </div>
                  <div className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold">
                    URGENT
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 italic">"{leave.reason}"</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLeaveAction(leave.id, 'approved')}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleLeaveAction(leave.id, 'rejected')}
                    className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No pending requests</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    rose: 'text-rose-600 bg-rose-50'
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className={`p-4 rounded-2xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
      </div>
    </div>
  )
}
