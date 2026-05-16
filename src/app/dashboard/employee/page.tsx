'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  ArrowUpRight,
  ClipboardList,
  User
} from 'lucide-react'
import { toast } from 'sonner'

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    attendanceRate: 0,
    pendingLeaves: 0
  })
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, taskRes, attRes, leaveRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
        supabase.from('leave_requests').select('*').eq('user_id', user.id).eq('status', 'pending')
      ])

      if (profRes.data) setProfile(profRes.data)
      if (taskRes.data) setTasks(taskRes.data)
      if (attRes.data) setAttendance(attRes.data)

      setStats({
        tasksCompleted: taskRes.data?.filter(t => t.status === 'done').length || 0,
        attendanceRate: 98, // Mocked for demo
        pendingLeaves: leaveRes.data?.length || 0
      })
    }
    fetchData()
  }, [supabase])

  const handleCheckIn = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('attendance').insert({
      user_id: user.id,
      check_in: new Date().toISOString(),
      status: 'present'
    })

    if (error) {
      toast.error('Failed to check in')
    } else {
      toast.success('Successfully checked in!')
      // Refresh attendance
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Good morning, {profile?.name?.split(' ')[0] || 'Employee'}!</h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your projects today.</p>
        </div>
        <button 
          onClick={handleCheckIn}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center space-x-2"
        >
          <Clock className="w-5 h-5" />
          <span>Check In Today</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Tasks Completed" 
          value={stats.tasksCompleted.toString()} 
          icon={CheckCircle2} 
          color="blue"
          trend="+2 this week"
        />
        <StatCard 
          title="Attendance Rate" 
          value={`${stats.attendanceRate}%`} 
          icon={Calendar} 
          color="emerald"
          trend="On track"
        />
        <StatCard 
          title="Pending Leaves" 
          value={stats.pendingLeaves.toString()} 
          icon={FileText} 
          color="amber"
          trend="1 upcoming"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Assigned Tasks</h3>
            </div>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          
          <div className="space-y-4">
            {tasks.length > 0 ? tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-10 rounded-full ${task.status === 'done' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                  <div>
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Due: {task.due_date || 'No date'}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  task.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {task.status.replace('_', ' ')}
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-slate-400 italic">No tasks assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Leave Request Form */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Request Leave</h3>
          </div>

          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            toast.success('Leave request submitted!');
          }}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
              <input 
                type="text" 
                placeholder="Vacation, Sick Leave, etc."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Start Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">End Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Submit Request
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Attendance */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Attendance Log</h3>
            </div>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">History</button>
          </div>

          <div className="space-y-4">
            {attendance.length > 0 ? attendance.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-medium text-xs">
                    {new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Checked In</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-medium text-slate-800">{entry.status}</p>
                   <p className="text-xs text-slate-400">Regular</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <p className="text-slate-400 italic text-sm">No attendance records yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-xl shadow-blue-500/20">
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{profile?.name}</h3>
          <p className="text-blue-600 font-semibold uppercase tracking-wider text-xs mt-1">{profile?.role}</p>
          <div className="grid grid-cols-2 gap-8 w-full mt-8 pt-8 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-tight">Department</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{profile?.department || 'General'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-tight">Email</p>
              <p className="text-sm font-bold text-slate-800 mt-1 truncate max-w-[150px]">{profile?.email}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600'
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-3xl font-bold text-slate-900 mt-1">{value}</h4>
      </div>
    </div>
  )
}
