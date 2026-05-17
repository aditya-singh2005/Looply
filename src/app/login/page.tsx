'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Target, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoLogging, setIsAutoLogging] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [isSeeding, setIsSeeding] = useState(false)

  const handleDemoLogin = async (demoEmail: string) => {
    setIsAutoLogging(true)
    setEmail(demoEmail)
    setPassword("Demo@1234")
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: "Demo@1234",
      })
      if (error) throw error
      toast.success("Logged in as demo account")
      const landing = demoEmail.includes("admin") ? "/admin" : "/dashboard";
      setTimeout(() => {
        window.location.href = landing;
      }, 100);
    } catch (error: any) {
      toast.error(error.message || "Demo login failed")
      setIsLoading(false)
      setIsAutoLogging(false)
    }
  }

  const handleSeedData = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seeding failed')
      toast.success('Seed data inserted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed database')
    } finally {
      setIsSeeding(false)
    }
  }



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Successfully logged in!')
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      const landing = profile?.role === 'admin' ? '/admin' : '/dashboard';
      setTimeout(() => {
        window.location.href = landing;
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Background Pattern */}
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
            <h1 className="text-2xl font-bold text-[#1b1b24] mb-2 tracking-tight">Sign in to GoalTrack</h1>
            <p className="text-[#777587] text-sm text-center">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#464555]">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-[#464555]">Password</label>
                <Link href="#" className="text-[13px] font-medium text-[#4f46e5] hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e4e1ee] rounded-lg text-[#1b1b24] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#4f46e5] hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>



          </form>

          <div className="mt-4">
            <button
              type="button"
              disabled={isSeeding || isLoading}
              onClick={handleSeedData}
              className="w-full py-2 px-4 border border-dashed border-[#4f46e5] text-[#4f46e5] bg-indigo-50/50 hover:bg-indigo-50 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  Seeding Demo Data...
                </>
              ) : (
                'Seed Demo Data'
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e4e1ee]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#777587] font-medium">
                  or use a demo account
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Employee", email: "employee@goaltrack.dev", color: "text-green-700 border-green-200 hover:bg-green-50" },
                { label: "Manager",  email: "manager@goaltrack.dev",  color: "text-blue-700 border-blue-200 hover:bg-blue-50"  },
                { label: "Admin",    email: "admin@goaltrack.dev",    color: "text-purple-700 border-purple-200 hover:bg-purple-50" },
              ].map(({ label, email, color }) => (
                <button
                  key={label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDemoLogin(email)}
                  className={`py-2 px-3 border rounded-lg text-xs font-semibold transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] text-[#777587] mt-2">
              Password: Demo@1234 · One click to sign in
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[#777587] text-[13px]">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[#4f46e5] font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-[#777587] text-xs">
          <p>© 2026 GoalTrack Technologies. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Link href="#" className="hover:text-[#464555] transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#464555] transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-[#464555] transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
