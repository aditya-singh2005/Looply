"use client";

import { useState, Suspense } from "react";
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
  return PAGE_TITLES[pathname] ?? "Looply";
}

function AppShellFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-28 rounded-xl bg-gray-100" />
      </div>
      <div className="h-96 rounded-xl bg-gray-100" />
    </div>
  );
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
        <div className="mx-auto max-w-content p-4 md:p-6 lg:p-8">
          <Suspense fallback={<AppShellFallback />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
