'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Target, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('employee')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: role,
          },
        },
      })

      if (error) throw error

      toast.success('Registration successful! Please check your email.')
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#e4e1ee 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-white border border-[#e4e1ee] rounded-2xl shadow-sm p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-white">
                <Target className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="text-xl font-bold text-[#1b1b24]">GoalTrack</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1b1b24] mb-2 tracking-tight">Create your account</h1>
            <p className="text-[#777587] text-sm text-center">Start tracking your team's goals with precision.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#464555]">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#464555]">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
                placeholder="e.g., john@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#464555]">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#464555]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
                placeholder="Your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#4f46e5] hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-4"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#777587] text-[13px]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#4f46e5] font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-[#777587] text-xs">
          <p>© 2026 GoalTrack Technologies. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <a href="#" className="hover:text-[#464555] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#464555] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#464555] transition-colors">Security</a>
          </div>
        </div>
      </div>
    </div>
  )
}
