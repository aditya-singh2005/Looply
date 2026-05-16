import type { ThrustArea } from "@/types";

export function ThrustAreaBadge({ area }: { area: Pick<ThrustArea, "name" | "color" | "bg_color"> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: area.bg_color, color: area.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
      {area.name}
    </span>
  );
}
