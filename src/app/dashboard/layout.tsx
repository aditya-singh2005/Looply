'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      // We don't redirect here, let the middleware handle it or just show the shell
      setLoading(false)
    }
    checkAuth()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="relative">
           <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
