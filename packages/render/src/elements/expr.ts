/**
 *
 * Renderers for Wikidot's expression and conditional constructs:
 *
 * - `[[# expr EXPRESSION]]` -- evaluate a mathematical expression and
 *   display the numeric result.
 * - `[[# if VALUE | THEN | ELSE]]` -- simple string-based truthiness check.
 * - `[[# ifexpr EXPRESSION | THEN | ELSE]]` -- evaluate a math expression
 *   and branch on the numeric result (0 = false, non-zero = true).
 *
 * All error messages match Wikidot's format (`"run-time error: ..."`).
 *
 * @module
 */

import type { Element, ExprData, IfCondData, IfExprData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";
import { evaluateExpression, isTruthy } from "../utils/expr-eval";

/**
 * Render a `[[# expr]]` element.
 *
 * Evaluates the mathematical expression and outputs the formatted numeric
 * result. On evaluation error, a Wikidot-compatible error message is
 * displayed. Empty expressions produce no output.
 *
 * @param ctx - The current render context.
 * @param data - Expression data containing the expression string.
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
 * Render a `[[# if]]` conditional element.
 *
 * The condition is treated as a string: values `"false"`, `"null"`,
 * `""`, and `"0"` are falsy; everything else is truthy. The selected
 * branch's elements are rendered with trailing whitespace trimmed.
 *
 * @param ctx - The current render context.
 * @param data - If-condition data with condition string and then/else branches.
 */
export function renderIf(ctx: RenderContext, data: IfCondData): void {
  const elements = isTruthy(data.condition) ? data.then : data.else;
  renderBranchElements(ctx, elements);
}

/**
 * Render a `[[# ifexpr]]` conditional expression element.
 *
 * Evaluates the mathematical expression; a result of 0 selects the
 * `else` branch, any non-zero result selects the `then` branch.
 * On evaluation error, a Wikidot-compatible error message is displayed
 * and neither branch is rendered.
 *
 * @param ctx - The current render context.
 * @param data - If-expression data with expression string and then/else branches.
 */
export function renderIfExpr(ctx: RenderContext, data: IfExprData): void {
  const result = evaluateExpression(data.expression);
  if (!result.success) {
    // ifexpr: error outputs error message (Wikidot-compatible)
    ctx.pushEscaped(`run-time error: ${result.error}`);
    return;
  }
  // 0 selects else branch, non-zero selects then branch
  const elements = result.value !== 0 ? data.then : data.else;
  renderBranchElements(ctx, elements);
}

/**
 * Render a branch's elements, trimming trailing whitespace-only text nodes.
 *
 * Wikidot strips trailing whitespace from `#if` / `#ifexpr` branch output.
 * This function finds the last non-whitespace element and renders only
 * up to that point.
 *
 * @param ctx - The current render context.
 * @param elements - The branch's element array.
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
 * Format a numeric result for display, matching Wikidot behavior.
 *
 * Integers are displayed without a decimal point. Floating-point values
 * are shown with up to 6 decimal places, with trailing zeros stripped.
 *
 * @param n - The number to format.
 * @returns Formatted string representation.
 */
function formatNumber(n: number): string {
  // Wikidot displays integers without decimal point
  if (Number.isInteger(n)) {
    return String(n);
  }
  // For decimals, show up to 6 decimal places without trailing zeros
  return n.toFixed(6).replace(/\.?0+$/, "");
}
