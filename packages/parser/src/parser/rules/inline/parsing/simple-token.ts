import type { Element } from "@wdprlib/ast";
import type { Token } from "../../../../lexer";

export interface SimpleInlineTokenResult {
  element: Element;
  consumed: number;
}

export function parseSimpleInlineToken(
  token: Token,
  nextToken: Token | undefined,
): SimpleInlineTokenResult | null {
  if (token.type === "TEXT" && token.value !== "(") {
    return { element: { element: "text", data: token.value }, consumed: 1 };
  }

  if (
    token.type === "WHITESPACE" &&
    nextToken?.type !== "BACKSLASH_BREAK" &&
    nextToken?.type !== "UNDERSCORE"
  ) {
    return { element: { element: "text", data: token.value }, consumed: 1 };
  }

  return null;
}
