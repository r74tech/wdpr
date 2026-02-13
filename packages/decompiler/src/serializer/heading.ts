import type { Element } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { serializeElements } from "./serialize-element";

/**
 * Serialize a heading element using `+` prefix syntax.
 *
 * The number of `+` characters equals the heading level. A `*` suffix
 * suppresses TOC inclusion (when `hasToc` is `false`).
 */
export function serializeHeading(
  ctx: SerializeContext,
  level: number,
  hasToc: boolean,
  elements: Element[],
): void {
  const prefix = "+".repeat(level);
  const tocMarker = hasToc ? "" : "*";
  ctx.push(prefix + tocMarker + " ");
  serializeElements(ctx, elements);
  ctx.push(ctx.newline);
}
