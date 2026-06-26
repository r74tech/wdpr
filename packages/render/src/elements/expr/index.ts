/**
 *
 * Renderers for Wikidot's expression and conditional constructs.
 *
 * @module
 */

import type { ExprData, IfCondData, IfExprData } from "@wdprlib/ast";
import { isTruthy } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderBranchElements } from "./branch";
import { evaluateExpressionOutput, evaluateIfExpressionValue } from "./result";

/**
 * Render a `[[#expr]]` element.
 *
 * Evaluates the mathematical expression and outputs the formatted numeric
 * result. On evaluation error, a Wikidot-compatible error message is
 * displayed. Empty expressions produce no output.
 *
 * @param ctx - The current render context.
 * @param data - Expression data containing the expression string.
 */
export function renderExpr(ctx: RenderContext, data: ExprData): void {
  const output = evaluateExpressionOutput(data.expression);
  if (output !== null) {
    ctx.pushEscaped(output);
  }
}

/**
 * Render a `[[#if]]` conditional element.
 *
 * The condition is treated as a string: values `"false"`, `"null"`,
 * `""`, and `"0"` are falsy; everything else is truthy.
 *
 * @param ctx - The current render context.
 * @param data - If-condition data with condition string and then/else branches.
 */
export function renderIf(ctx: RenderContext, data: IfCondData): void {
  renderBranchElements(ctx, isTruthy(data.condition) ? data.then : data.else);
}

/**
 * Render a `[[#ifexpr]]` conditional expression element.
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
  const value = evaluateIfExpressionValue(data.expression);
  if (typeof value === "string") {
    ctx.pushEscaped(value);
    return;
  }

  renderBranchElements(ctx, value !== 0 ? data.then : data.else);
}
