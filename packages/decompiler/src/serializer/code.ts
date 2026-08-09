import type { CodeBlockData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { formatDirectiveAttributes, hasBlockCloseCandidate } from "./directive-safety";

/**
 * Serialize a code block element to `[[code]]...[[/code]]` syntax.
 *
 * Includes `type` and `name` attributes when present.
 */
export function serializeCode(ctx: SerializeContext, data: CodeBlockData): void {
  if (hasBlockCloseCandidate(data.contents, "code")) return;
  const attributes: Record<string, string> = {};
  if (data.language) {
    attributes.type = data.language;
  }
  if (data.name) {
    attributes.name = data.name;
  }

  const attrStr = formatDirectiveAttributes(attributes);

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
