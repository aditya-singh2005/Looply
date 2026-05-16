import { GoalDetailPage } from "@/components/goals/GoalDetailPage";

export default function GoalDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <GoalDetailPage goalId={params.id} />;
}
