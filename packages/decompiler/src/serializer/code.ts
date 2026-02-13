import type { CodeBlockData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";

/**
 * Serialize a code block element to `[[code]]...[[/code]]` syntax.
 *
 * Includes `type` and `name` attributes when present.
 */
export function serializeCode(ctx: SerializeContext, data: CodeBlockData): void {
  const attrs: string[] = [];
  if (data.language) {
    attrs.push(`type="${data.language}"`);
  }
  if (data.name) {
    attrs.push(`name="${data.name}"`);
  }

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  ctx.pushBlockLine(`[[code${attrStr}]]`);
  if (data.contents.length > 0) {
    ctx.push(data.contents);
    if (!data.contents.endsWith("\n")) {
      ctx.push(ctx.newline);
    }
  }
  ctx.pushBlockLine("[[/code]]");
  ctx.requestBlankLine();
}
