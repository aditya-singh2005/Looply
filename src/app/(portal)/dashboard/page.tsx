"use client";

import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { useRole } from "@/lib/hooks/useRole";

export default function DashboardPage() {
  const { role, mounted } = useRole();

  if (!mounted) return null;

  if (role === "manager") {
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard />;
}
