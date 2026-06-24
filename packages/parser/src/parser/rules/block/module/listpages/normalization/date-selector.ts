import type { DateComparisonOp, NormalizedDateSelector } from "../types";

/**
 * Date comparison operators, ordered longest-first.
 */
const DATE_COMPARISON_OPS: DateComparisonOp[] = ["<=", ">=", "<>", "<", ">", "="];

/**
 * Pattern for relative date expressions like "last 7 days".
 */
const RELATIVE_DATE_PATTERN = /^last\s+(?:(\d+)\s+)?(day|week|month)s?$/i;

/**
 * Parse date selector string into structured format.
 */
export function parseDateSelector(value: string): NormalizedDateSelector | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const relativeMatch = trimmed.match(RELATIVE_DATE_PATTERN);
  if (relativeMatch && relativeMatch[2]) {
    const count = relativeMatch[1] ? parseInt(relativeMatch[1], 10) : 1;
    if (count < 1) return undefined;
    const unit = relativeMatch[2].toLowerCase() as "day" | "week" | "month";
    return { type: "relative", unit, count };
  }

  for (const op of DATE_COMPARISON_OPS) {
    if (trimmed.startsWith(op)) {
      const date = trimmed.slice(op.length).trim();
      if (date) {
        return { type: "comparison", op, date };
      }
    }
  }

  if (/^\d{4}$/.test(trimmed)) {
    return { type: "year", year: parseInt(trimmed, 10) };
  }

  const monthMatch = trimmed.match(/^(\d{4})\.(\d{1,2})$/);
  if (monthMatch && monthMatch[1] && monthMatch[2]) {
    const month = parseInt(monthMatch[2], 10);
    if (month < 1 || month > 12) return undefined;
    return {
      type: "month",
      year: parseInt(monthMatch[1], 10),
      month,
    };
  }

  return undefined;
}
