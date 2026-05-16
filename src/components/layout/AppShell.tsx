"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/goals": "My Goals",
  "/goals/new": "Create Goal",
  "/checkin": "Quarterly Check-in",
  "/manager/team": "Team Goals",
  "/manager/checkins": "Team Check-ins",
  "/admin": "Admin Overview",
  "/admin/cycles": "Cycle Management",
  "/admin/shared-goals": "Push Shared Goals",
  "/admin/audit": "Audit Log",
  "/admin/reports": "Reports",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/goals/") && pathname !== "/goals/new") {
    return "Goal Details";
  }
  return PAGE_TITLES[pathname] ?? "GoalTrack";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-surface-page">
      <Sidebar />
      <Topbar
        title={getPageTitle(pathname)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="min-h-screen pt-topbar md:pl-16 lg:pl-[240px]">
        <div className="mx-auto max-w-content p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
