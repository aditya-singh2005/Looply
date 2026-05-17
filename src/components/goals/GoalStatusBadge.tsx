import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/types";

const STYLES: Record<GoalStatus, string> = {
  draft: "bg-surface-container text-text-secondary",
  submitted: "bg-info-bg text-info",
  approved: "bg-success-bg text-success",
  returned: "bg-danger-bg text-danger",
  locked: "bg-success-bg text-success",
};

const LABELS: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  returned: "Returned",
  locked: "Approved",
};

export function GoalStatusBadge({
  status,
  showLock,
}: {
  status: GoalStatus;
  showLock?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STYLES[status]
      )}
    >
      {showLock && <Lock className="h-3 w-3" strokeWidth={2} />}
      {LABELS[status]}
    </span>
  );
}
