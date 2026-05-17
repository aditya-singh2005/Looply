'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface AuthContextType {
  role: string | null;
  user: any | null;
  mounted: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  mounted: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchUser(authUser: any) {
      if (!authUser) {
        if (mounted) {
          setRole(null);
          setUser(null);
          setMounted(true);
        }
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (profile && mounted) {
          setRole(profile.role);
          setUser(profile);
        }
      } catch (e) {
        console.error('Error in AuthContext:', e);
      } finally {
        if (mounted) setMounted(true);
      }
    }

    // Initial session fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchUser(user);
    });

    // Subscribe to auth changes (login/logout/switch user)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      fetchUser(session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ role, user, mounted, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
