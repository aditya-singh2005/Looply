export function validateWeightage(
  goals: { id: string; weightage: number }[],
  currentGoalId: string | null,
  newWeightage: number
): { valid: boolean; total: number; remaining: number; error?: string } {
  const otherGoals = goals.filter((g) => g.id !== currentGoalId);
  const otherTotal = otherGoals.reduce((sum, g) => sum + Number(g.weightage), 0);
  const total = otherTotal + newWeightage;
  return {
    valid: total <= 100 && newWeightage >= 10,
    total,
    remaining: 100 - otherTotal,
    error:
      total > 100
        ? `Total exceeds 100% (currently ${total}%)`
        : newWeightage < 10
          ? "Minimum weightage is 10%"
          : undefined,
  };
}
