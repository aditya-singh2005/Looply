"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRole } from "@/lib/hooks/useRole";
import { toast } from "sonner";
import { IDS } from "@/constants";
import { ChevronDown, Drama } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEMO_ACCOUNTS = [
  { role: "Employee", email: "employee@goaltrack.dev", userId: IDS.users.emp1, password: "Demo@1234" },
  { role: "Manager", email: "manager@goaltrack.dev", userId: IDS.users.mgr, password: "Demo@1234" },
  { role: "Admin", email: "admin@goaltrack.dev", userId: IDS.users.admin, password: "Demo@1234" },
] as const;

export function RoleSwitcher({ className }: { className?: string }) {
  const { role, mounted, signOut } = useRole();
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  const switchTo = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    if (switching) return;
    setSwitching(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) throw error;
      toast.success(`Switched to ${account.role} view`);
      // Force a client‑side navigation to dashboard to avoid server‑side redirect latency
      router.replace('/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`relative flex items-center ${className ?? ''}`}> 
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={switching}>
            {role ?? 'Switch Role'}
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {DEMO_ACCOUNTS.map((account) => (
            <DropdownMenuItem key={account.role} onSelect={() => switchTo(account)} disabled={switching}>
              Demo: {account.role}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
