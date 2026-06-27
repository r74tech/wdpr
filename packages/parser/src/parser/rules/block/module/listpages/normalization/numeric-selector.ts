import type { NormalizedNumericSelector, NumericComparisonOp } from "../types";

/**
 * Numeric comparison operators, ordered longest-first.
 */
const NUMERIC_COMPARISON_OPS: NumericComparisonOp[] = ["<=", ">=", "<", ">", "="];

/**
 * Parse numeric selector string into structured format.
 */
export function parseNumericSelector(value: string): NormalizedNumericSelector | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  for (const op of NUMERIC_COMPARISON_OPS) {
    if (trimmed.startsWith(op)) {
      const numStr = trimmed.slice(op.length).trim();
      const num = parseFloat(numStr);
      if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(numStr)) {
        return { op, value: num };
      }
      return undefined;
    }
  }

  const num = parseFloat(trimmed);
  if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { op: "=", value: num };
  }

  return undefined;
}
