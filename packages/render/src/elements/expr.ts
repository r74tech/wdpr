import type { Element, ExprData, IfCondData, IfExprData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";
import { evaluateExpression, isTruthy } from "../utils/expr-eval";

/**
 * Render #expr - evaluates expression and displays the result
 * On error, outputs Wikidot-compatible error message
 * Empty expression outputs nothing (Wikidot-compatible)
 */
export function renderExpr(ctx: RenderContext, data: ExprData): void {
  const result = evaluateExpression(data.expression);
  if (result.success) {
    ctx.pushEscaped(formatNumber(result.value));
  } else if (result.error !== "empty expression") {
    ctx.pushEscaped(`run-time error: ${result.error}`);
  }
  // Empty expression outputs nothing
}

/**
 * Render #if - simple true/false check (treats value as string)
 */
export function renderIf(ctx: RenderContext, data: IfCondData): void {
  const elements = isTruthy(data.condition) ? data.then : data.else;
  renderBranchElements(ctx, elements);
}

/**
 * Render #ifexpr - evaluates expression and branches based on result
 * On error, selects else branch (Wikidot-compatible)
 */
export function renderIfExpr(ctx: RenderContext, data: IfExprData): void {
  const result = evaluateExpression(data.expression);
  // ifexpr: error or 0 selects else branch
  const isTrue = result.success && result.value !== 0;
  const elements = isTrue ? data.then : data.else;
  renderBranchElements(ctx, elements);
}

/**
 * Render branch elements, trimming trailing whitespace-only text elements
 * Wikidot trims trailing whitespace from if/ifexpr branches
 */
function renderBranchElements(ctx: RenderContext, elements: Element[]): void {
  // Find the last non-whitespace element
  let lastIdx = elements.length - 1;
  while (lastIdx >= 0) {
    const el = elements[lastIdx]!;
    if (el.element === "text" && typeof el.data === "string" && el.data.trim() === "") {
      lastIdx--;
    } else {
      break;
    }
  }
  // Render only up to the last non-whitespace element
  renderElements(ctx, elements.slice(0, lastIdx + 1));
}

/**
 * Format number for display (matches Wikidot behavior)
 */
function formatNumber(n: number): string {
  // Wikidot displays integers without decimal point
  if (Number.isInteger(n)) {
    return String(n);
  }
  // For decimals, show up to 6 decimal places without trailing zeros
  return n.toFixed(6).replace(/\.?0+$/, "");
}
