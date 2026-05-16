"use client";

import { cn } from "@/lib/utils";
import { useRole } from "@/lib/hooks/useRole";
import type { Role } from "@/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "employee", label: "Employee" },
  { id: "manager", label: "Manager" },
  { id: "admin", label: "Admin" },
];

export function RoleSwitcher({ className }: { className?: string }) {
  const { role, switchRole, mounted } = useRole();

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-1 rounded-lg bg-surface-container p-1", className)}>
        {ROLES.map((r) => (
          <div key={r.id} className="h-8 w-20 animate-pulse rounded-md bg-border-subtle" />
        ))}
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-white p-1",
        className
      )}
      aria-label="Switch demo role"
    >
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => r.id !== role && switchRole(r.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-100",
            role === r.id
              ? "bg-primary-subtle text-primary"
              : "text-text-secondary hover:text-primary"
          )}
        >
          {r.label}
        </button>
      ))}
    </nav>
  );
}
