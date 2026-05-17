"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();
          
          if (profile) {
            setRole(profile.role);
            setUser(profile);
          }
        }
      } catch (e) {
        console.error("Error in useRole:", e);
      } finally {
        setMounted(true);
      }
    }
    getSession();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return { role, user, mounted, signOut };
}
