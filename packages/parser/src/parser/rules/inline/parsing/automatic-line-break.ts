import type { Element } from "@wdprlib/ast";
import type { Token } from "../../../../lexer";
import type { ParseContext } from "../../types";

// Suppressed newlines must not cause an earlier, unrelated break to be removed.
const origins = new WeakMap<Element, Token>();

export function createAutomaticLineBreak(token: Token): Element {
  const element: Element = { element: "line-break" };
  origins.set(element, token);
  return element;
}

export function precedingSingleNewline(ctx: ParseContext): Token | undefined {
  let pos = ctx.pos - 1;
  while (ctx.tokens[pos]?.type === "WHITESPACE") pos--;
  const newline = ctx.tokens[pos];
  if (newline?.type !== "NEWLINE") return undefined;
  pos--;
  while (ctx.tokens[pos]?.type === "WHITESPACE") pos--;
  if (ctx.tokens[pos]?.type === "NEWLINE") return undefined;
  return newline;
}

export function stripAutomaticLineBreak(elements: Element[], token: Token | undefined): void {
  if (!token) return;
  let index = elements.length - 1;
  while (index >= 0) {
    const element = elements[index];
    if (element?.element !== "text" || !/^[ \t]*$/.test(element.data)) break;
    index--;
  }
  const element = elements[index];
  if (element && origins.get(element) === token) elements.length = index;
}
