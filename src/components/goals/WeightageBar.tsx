import type { Goal, ThrustArea } from "@/types";
import { cn } from "@/lib/utils";

type Segment = {
  id: string;
  label: string;
  weightage: number;
  color: string;
  isPending?: boolean;
};

export function WeightageBar({
  goals,
  pendingWeightage = 0,
  pendingLabel = "New goal",
  pendingColor = "#4F46E5",
  showLegend = true,
  className,
}: {
  goals: (Pick<Goal, "id" | "title" | "weightage"> & { thrust_areas?: ThrustArea | null })[];
  pendingWeightage?: number;
  pendingLabel?: string;
  pendingColor?: string;
  showLegend?: boolean;
  className?: string;
}) {
  const segments: Segment[] = goals.map((g) => ({
    id: g.id,
    label: g.title,
    weightage: Number(g.weightage),
    color: g.thrust_areas?.color ?? "#4F46E5",
  }));

  if (pendingWeightage > 0) {
    segments.push({
      id: "pending",
      label: pendingLabel,
      weightage: pendingWeightage,
      color: pendingColor,
      isPending: true,
    });
  }

  const used = segments.reduce((s, g) => s + g.weightage, 0);
  const remaining = Math.max(0, 100 - used);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-2 overflow-hidden rounded-xl bg-gray-100">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={cn("h-full transition-all", seg.isPending && "opacity-80")}
            style={{
              width: `${seg.weightage}%`,
              backgroundColor: seg.color,
              minWidth: seg.weightage > 0 ? "4px" : 0,
            }}
            title={`${seg.label}: ${seg.weightage}%`}
          />
        ))}
        {remaining > 0 && (
          <div className="h-full bg-gray-100" style={{ width: `${remaining}%` }} />
        )}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((seg) => (
            <div key={seg.id} className="flex max-w-[140px] items-center gap-1.5 text-xs text-gray-600">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate">{seg.label}</span>
              <span className="shrink-0 font-medium">{seg.weightage}%</span>
            </div>
          ))}
          {remaining > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-2 w-2 rounded-full bg-gray-200" />
              <span>Remaining {remaining}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
