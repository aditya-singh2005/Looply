"use client";

import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/types";

export type GoalFilter = "all" | GoalStatus;

const FILTERS: { id: GoalFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Returned" },
];

export function FilterPills({
  active,
  onChange,
  counts,
}: {
  active: GoalFilter;
  onChange: (f: GoalFilter) => void;
  counts: Record<GoalFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-100",
            active === f.id
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {f.label} ({counts[f.id]})
        </button>
      ))}
    </div>
  );
}
