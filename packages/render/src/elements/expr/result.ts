import { evaluateExpression, formatExprValue } from "@wdprlib/ast";

export function evaluateExpressionOutput(expression: string): string | null {
  const result = evaluateExpression(expression);
  if (result.success) {
    return formatExprValue(result.value);
  }

  if (result.error === "empty expression") {
    return null;
  }

  return `run-time error: ${result.error}`;
}

export function evaluateIfExpressionValue(expression: string): number | string {
  const result = evaluateExpression(expression);
  return result.success ? result.value : `run-time error: ${result.error}`;
}
