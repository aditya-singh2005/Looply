'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Shield, 
  Users, 
  Building2, 
  BarChart3,
  Search,
  Filter,
  Trash2,
  Edit,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: userRes } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      const { data: deptRes } = await supabase.from('departments').select('*')

      if (userRes) setUsers(userRes)
      if (deptRes) setDepartments(deptRes)
      setLoading(false)
    }
    fetchData()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('dashboard-admin:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also remove their auth account.')) return
    
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete user')
    } else {
      toast.success('User deleted successfully')
      setUsers(users.filter(u => u.id !== id))
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Administration</h1>
          <p className="text-slate-500 mt-1">Control center for company-wide settings and users.</p>
        </div>
        <button className="px-6 py-3 bg-[#0f172a] text-white font-semibold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Invite New User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Staff" value={users.length.toString()} icon={Users} color="blue" />
        <StatCard title="Departments" value={departments.length.toString()} icon={Building2} color="indigo" />
        <StatCard title="Admins" value={users.filter(u => u.role === 'admin').length.toString()} icon={Shield} color="amber" />
        <StatCard title="Avg Attendance" value="94%" icon={BarChart3} color="emerald" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-800">User Management</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/50">
                <th className="px-8 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">User Details</th>
                <th className="px-8 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Role</th>
                <th className="px-8 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Department</th>
                <th className="px-8 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Joined Date</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-400">Loading staff directory...</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      user.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-slate-600">{user.department || 'General'}</span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
      </div>
    </div>
  )
}
