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

  const handleDemoLogin = async (demoEmail: string) => {
    setIsAutoLogging(true)
    setEmail(demoEmail)
    setPassword("demo1234")
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: "demo1234",
      })
      if (error) throw error
      toast.success("Logged in as demo account")
      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Demo login failed")
    } finally {
      setIsLoading(false)
      setIsAutoLogging(false)
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
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
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
                <a href="#" className="text-[13px] font-medium text-[#4f46e5] hover:underline">Forgot password?</a>
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
            
            {/* Optional SSO Buttons matching design variant */}
            <div className="pt-4 flex gap-3">
              <button type="button" className="flex-1 py-2.5 border border-[#e4e1ee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm font-medium text-[#464555]">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" className="flex-1 py-2.5 border border-[#e4e1ee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm font-medium text-[#464555]">
                <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
                SSO
              </button>
            </div>
          </form>

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
                { label: "Employee", email: "employee@goaltrack.com", color: "text-green-700 border-green-200 hover:bg-green-50" },
                { label: "Manager",  email: "manager@goaltrack.com",  color: "text-blue-700 border-blue-200 hover:bg-blue-50"  },
                { label: "Admin",    email: "admin@goaltrack.com",    color: "text-purple-700 border-purple-200 hover:bg-purple-50" },
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
              Password: demo1234 · One click to sign in
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
            <a href="#" className="hover:text-[#464555] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#464555] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#464555] transition-colors">Security</a>
          </div>
        </div>
      </div>
    </div>
  )
}
