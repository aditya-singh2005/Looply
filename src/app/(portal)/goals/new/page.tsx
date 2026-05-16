import { Suspense } from "react";
import { GoalWizard } from "@/components/goals/GoalWizard";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewGoalPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[720px] space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <GoalWizard />
    </Suspense>
  );
}
