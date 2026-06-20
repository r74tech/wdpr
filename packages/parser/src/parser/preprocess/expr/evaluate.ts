import { evaluateExpression, formatExprValue, isTruthy } from "@wdprlib/ast";
import type { DirectiveKind, DirectiveMatch } from "./types";

/** Evaluate a parsed directive into its replacement string. */
export function evaluateDirective(kind: DirectiveKind, match: DirectiveMatch): string {
  if (kind === "expr") {
    const result = evaluateExpression(match.head);
    if (result.success) return formatExprValue(result.value);
    if (result.error === "empty expression") return "";
    return "ERROR";
  }

  if (kind === "if") {
    if (!match.hasPipe) return "";
    return isTruthy(match.head) ? match.thenText : match.elseText;
  }

  if (!match.hasPipe) return "";
  const result = evaluateExpression(match.head);
  if (!result.success) return "ERROR";
  return result.value !== 0 && !Number.isNaN(result.value) ? match.thenText : match.elseText;
}
