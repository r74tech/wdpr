import type { MathData, MathInlineData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import {
  hasBlockCloseCandidate,
  hasInlineMathCloseCandidate,
  isSafeBareToken,
} from "./directive-safety";

/**
 * Serialize a block math element.
 *
 * Single-line LaTeX is emitted inline as `[[math]] expr [[/math]]`.
 * Multi-line LaTeX uses the block form with content on separate lines.
 */
export function serializeMath(ctx: SerializeContext, data: MathData): void {
  if (hasBlockCloseCandidate(data["latex-source"], "math")) return;
  const attrs: string[] = [];
  if (data.name && isSafeBareToken(data.name)) {
    attrs.push(data.name);
  }
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (!data["latex-source"].includes("\n")) {
    // Single-line LaTeX → inline form
    ctx.pushBlockLine(`[[math${attrStr}]] ${data["latex-source"]} [[/math]]`);
  } else {
    // Multi-line LaTeX → block form
    ctx.pushBlockLine(`[[math${attrStr}]]`);
    ctx.push(data["latex-source"]);
    if (!data["latex-source"].endsWith("\n")) {
      ctx.push(ctx.newline);
    }
    ctx.pushBlockLine("[[/math]]");
  }
  ctx.requestBlankLine();
}

/** Serialize an inline math element as `[[$ expr $]]`. */
export function serializeMathInline(ctx: SerializeContext, data: MathInlineData): void {
  if (hasInlineMathCloseCandidate(data["latex-source"])) return;
  ctx.push(`[[$ ${data["latex-source"]} $]]`);
}
