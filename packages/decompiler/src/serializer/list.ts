import type { ListData, DefinitionListItem } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { serializeElements } from "./serialize-element";

/**
 * Serialize a list element to Wikidot bullet (`*`) or numbered (`#`) syntax.
 *
 * Nesting is represented by space indentation. The `forceLineBreakSyntax`
 * flag is enabled during list serialization to ensure line breaks use
 * the explicit ` _\n` form.
 *
 * @param ctx - Serialization context
 * @param data - List data
 * @param depth - Current nesting depth (0 = top-level)
 */
export function serializeList(ctx: SerializeContext, data: ListData, depth: number = 0): void {
  const marker = data.type === "numbered" ? "#" : "*";
  const prefix = " ".repeat(depth) + marker;

  const prevForce = ctx.forceLineBreakSyntax;
  ctx.forceLineBreakSyntax = true;
  for (const item of data.items) {
    if (item["item-type"] === "sub-list") {
      serializeList(ctx, item.data, depth + 1);
    } else {
      ctx.push(`${prefix} `);
      serializeElements(ctx, item.elements);
      ctx.push(ctx.newline);
    }
  }
  ctx.forceLineBreakSyntax = prevForce;

  // Request a blank line only after the top-level list
  if (depth === 0) {
    ctx.requestBlankLine();
  }
}

/**
 * Serialize a definition list to Wikidot `: key : value` syntax.
 *
 * The `forceLineBreakSyntax` flag is enabled during serialization.
 */
export function serializeDefinitionList(ctx: SerializeContext, items: DefinitionListItem[]): void {
  const prevForce = ctx.forceLineBreakSyntax;
  ctx.forceLineBreakSyntax = true;
  for (const item of items) {
    ctx.push(": ");
    serializeElements(ctx, item.key);
    ctx.push(" : ");
    serializeElements(ctx, item.value);
    ctx.push(ctx.newline);
  }
  ctx.forceLineBreakSyntax = prevForce;
  ctx.requestBlankLine();
}
