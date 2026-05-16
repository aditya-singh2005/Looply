import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonRow() {
  return (
    <tr className="border-b border-border-subtle">
      <td className="px-5 py-3" colSpan={6}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-1 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-2 w-24" />
        </div>
      </td>
    </tr>
  );
}
