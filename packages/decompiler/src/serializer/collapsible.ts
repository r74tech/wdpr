import type { CollapsibleData } from "@wdprlib/ast";
import { SerializeContext } from "./context";
import { serializeElements } from "./serialize-element";

/**
 * Serialize a collapsible element to `[[collapsible]]...[[/collapsible]]` syntax.
 *
 * Attributes (`show`, `hide`, `folded`, `hideLocation`) are emitted only
 * when they differ from the Wikidot defaults.
 */
export function serializeCollapsible(ctx: SerializeContext, data: CollapsibleData): void {
  const attrs: string[] = [];

  if (data["show-text"]) {
    attrs.push(`show="${data["show-text"]}"`);
  }
  if (data["hide-text"]) {
    attrs.push(`hide="${data["hide-text"]}"`);
  }
  if (data["start-open"]) {
    attrs.push(`folded="no"`);
  }

  // hideLocation: default is show-top=true, show-bottom=false (= "top")
  if (!data["show-top"] && !data["show-bottom"]) {
    attrs.push(`hideLocation="neither"`);
  } else if (!data["show-top"] && data["show-bottom"]) {
    attrs.push(`hideLocation="bottom"`);
  } else if (data["show-top"] && data["show-bottom"]) {
    attrs.push(`hideLocation="both"`);
  }
  // show-top=true, show-bottom=false is the default → no attribute needed

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  ctx.pushBlockLine(`[[collapsible${attrStr}]]`);
  const innerCtx = new SerializeContext({ newline: ctx.newline });
  serializeElements(innerCtx, data.elements);
  ctx.push(innerCtx.getBlockInnerOutput());
  ctx.pushBlockLine("[[/collapsible]]");
  ctx.requestBlankLine();
}
