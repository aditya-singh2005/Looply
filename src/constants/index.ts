import type { Role } from "@/types";
import {
  LayoutDashboard,
  Target,
  ClipboardCheck,
  BarChart3,
  Users,
  RefreshCw,
  Shield,
  FileText,
  Share2,
  type LucideIcon,
} from "lucide-react";

export const IDS = {
  cycle: "44444444-4444-4444-8444-000000002025",
  users: {
    admin: "22222222-2222-4222-8222-000000000001",
    mgr: "22222222-2222-4222-8222-000000000002",
    emp1: "22222222-2222-4222-8222-000000000003",
    emp2: "22222222-2222-4222-8222-000000000004",
    emp3: "22222222-2222-4222-8222-000000000005",
    emp4: "22222222-2222-4222-8222-000000000006",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Goals", href: "/goals", icon: Target },
  { label: "Check-ins", href: "/checkin", icon: ClipboardCheck },
];

const managerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Team Goals", href: "/manager/team", icon: Users },
  { label: "Team Check-ins", href: "/manager/checkins", icon: ClipboardCheck },
];

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: Shield },
  { label: "Cycle Management", href: "/admin/cycles", icon: RefreshCw },
  { label: "Shared Goals", href: "/admin/shared-goals", icon: Share2 },
  { label: "Audit Log", href: "/admin/audit", icon: FileText },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
];

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  employee: employeeNav,
  manager: managerNav,
  admin: adminNav,
};

export const MAX_GOALS = 8;
export const MIN_WEIGHTAGE = 10;
