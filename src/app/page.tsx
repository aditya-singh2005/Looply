import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Index() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Role-based redirect
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile) {
    return redirect('/dashboard')
  }

  return redirect('/login')
}
