export function computeScore(
  uomType: string,
  targetValue: number | null,
  targetDate: string | null,
  actualValue: number | null,
  actualDate: string | null
): number | null {
  if (actualValue === null && actualDate === null) return null;
  switch (uomType) {
    case "numeric_min":
      if (actualValue == null || !targetValue) return null;
      return Math.min((actualValue / targetValue) * 100, 100);
    case "numeric_max":
      if (actualValue == null || !targetValue || actualValue === 0) return null;
      return Math.min((targetValue / actualValue) * 100, 100);
    case "timeline": {
      if (!targetDate || !actualDate) return null;
      const target = new Date(targetDate);
      const actual = new Date(actualDate);
      return actual <= target
        ? 100
        : Math.max(0, 100 - ((actual.getTime() - target.getTime()) / 86400000) * 5);
    }
    case "zero":
      if (actualValue == null) return null;
      return actualValue === 0 ? 100 : 0;
    default:
      return null;
  }
}
