"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE } from "@/constants";
import { useRole } from "@/lib/hooks/useRole";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const { role, user, mounted } = useRole();
  const navItems = NAV_BY_ROLE[role];
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logged out successfully");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error("Logout failed");
      console.error(error);
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-surface-sidebar py-4",
        "hidden md:flex md:w-16 lg:w-[240px]"
      )}
    >
      <div className="mb-6 flex items-center gap-2 px-3 lg:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Target className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </div>
        <div className="hidden overflow-hidden lg:block">
          <h1 className="text-lg font-bold leading-none text-primary">GoalTrack</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Enterprise Edition
          </p>
        </div>
      </div>

      <div className="mb-4 px-2 lg:px-3">
        <Link
          href="/goals/new"
          title="New Goal"
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-hover lg:justify-start lg:px-3"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="hidden lg:inline">New Goal</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 lg:px-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-100",
                "md:justify-center lg:justify-start",
                active
                  ? "border-l-[3px] border-primary bg-primary-subtle font-bold text-primary"
                  : "border-l-[3px] border-transparent text-text-secondary hover:bg-surface-container hover:text-primary"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border px-2 pt-4 lg:px-3">
        <div 
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-container cursor-pointer transition-colors group"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary group-hover:bg-primary-subtle/80">
            {mounted && user ? user.name.charAt(0) : "—"}
          </div>
          <div className="hidden min-w-0 flex-1 lg:block text-left">
            <p className="truncate text-xs font-bold group-hover:text-primary transition-colors">
              {mounted && user ? user.name : "Loading…"}
            </p>
            <p className="truncate text-[10px] text-text-muted">
              {mounted && user ? user.email : ""}
            </p>
          </div>
          <LogOut className="hidden h-[18px] w-[18px] text-red-500 lg:block group-hover:scale-110 transition-transform" strokeWidth={2} />
        </div>
      </div>
    </aside>
  );
}
