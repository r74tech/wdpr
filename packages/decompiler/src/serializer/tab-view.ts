import type { TabData } from "@wdprlib/ast";
import { SerializeContext } from "./context";
import { serializeElements } from "./serialize-element";

/** Serialize a tab-view element to `[[tabview]]...[[/tabview]]` syntax. */
export function serializeTabView(ctx: SerializeContext, tabs: TabData[]): void {
  ctx.pushBlockLine("[[tabview]]");
  for (const tab of tabs) {
    ctx.pushBlockLine(`[[tab ${tab.label}]]`);
    const innerCtx = new SerializeContext({ newline: ctx.newline });
    serializeElements(innerCtx, tab.elements);
    ctx.push(innerCtx.getBlockInnerOutput());
    ctx.pushBlockLine("[[/tab]]");
  }
  ctx.pushBlockLine("[[/tabview]]");
  ctx.requestBlankLine();
}
