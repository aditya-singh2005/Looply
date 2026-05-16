"use client";

import { useState, useEffect } from "react";
import type { Role } from "@/types";
import { IDS } from "@/constants";

const ROLE_USERS = {
  employee: {
    id: IDS.users.emp1,
    name: "Arjun Mehta",
    email: "employee@goaltrack.com",
  },
  manager: {
    id: IDS.users.mgr,
    name: "Priya Sharma",
    email: "manager@goaltrack.com",
  },
  admin: {
    id: IDS.users.admin,
    name: "Rahul Verma",
    email: "admin@goaltrack.com",
  },
} as const;

export function useRole() {
  const [role, setRole] = useState<Role>("employee");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("demo_role") as Role | null;
    if (saved && ROLE_USERS[saved]) setRole(saved);
    setMounted(true);
  }, []);

  const switchRole = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("demo_role", newRole);
    window.location.reload();
  };

  return { role, user: ROLE_USERS[role], switchRole, mounted };
}
