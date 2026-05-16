import { cn } from "@/lib/utils";

export function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        —
      </span>
    );
  }
  const rounded = Math.round(score);
  const color =
    rounded > 80
      ? "bg-success-bg text-success"
      : rounded >= 50
        ? "bg-warning-bg text-warning"
        : "bg-danger-bg text-danger";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {rounded}%
    </span>
  );
}
