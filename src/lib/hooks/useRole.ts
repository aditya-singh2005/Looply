"use client";

import { useState, useEffect } from "react";
import type { Role } from "@/types";
import { createClient } from "@/lib/supabase";

const ROLE_USERS = {
  employee: {
    id: "22222222-2222-4222-8222-000000000003",
    name: "Arjun Mehta",
    email: "employee@goaltrack.com",
  },
  manager: {
    id: "22222222-2222-4222-8222-000000000002",
    name: "Priya Sharma",
    email: "manager@goaltrack.com",
  },
  admin: {
    id: "22222222-2222-4222-8222-000000000001",
    name: "Rahul Verma",
    email: "admin@goaltrack.com",
  },
} as const;

export function useRole() {
  const [role, setRole] = useState<Role>("employee");
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
            setRole(profile.role as Role);
            setUser(profile);
          } else {
            // Fallback to local storage or default if profile not found in DB
            const saved = localStorage.getItem("demo_role") as Role | null;
            if (saved) {
              setRole(saved);
              setUser(ROLE_USERS[saved]);
            }
          }
        } else {
          // No auth session, use demo role
          const saved = localStorage.getItem("demo_role") as Role | null;
          if (saved) {
            setRole(saved);
            setUser(ROLE_USERS[saved]);
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

  const switchRole = async (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("demo_role", newRole);
    
    // Also try to update DB if logged in
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from("users").update({ role: newRole }).eq("id", authUser.id);
    }
    window.location.reload();
  };

  return { role, user: user || ROLE_USERS[role], switchRole, mounted };
}
