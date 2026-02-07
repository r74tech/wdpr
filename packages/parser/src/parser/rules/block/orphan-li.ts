/**
 * @module orphan-li
 *
 * Block rule for `[[li]]...[[/li]]` appearing outside of any `[[ul]]`/`[[ol]]` block.
 *
 * When `[[li]]` is used without an enclosing list block, Wikidot does NOT
 * create a list item. Instead, it treats the tags as literal text and
 * renders the body content without `<p>` wrapping, using `<br />` for
 * newlines.
 *
 * Example input:
 * ```
 * [[li]]
 * Baz
 * [[/li]]
 * ```
 *
 * Rendered output:
 * ```
 * [[li]]<br />Baz<br />[[/li]]
 * ```
 *
 * This rule exists to correctly consume and reproduce that output. Without
 * it, the parser would try to match `[[li]]` against other block rules
 * and potentially produce incorrect results.
 *
 * If no `[[/li]]` closing tag is found, the rule fails.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Tests whether the tokens at `pos` form a `[[li]]` opening tag.
 * Only the exact name `"li"` matches; `[[li_]]` is not recognised.
 *
 * @param ctx - Parse context.
 * @param pos - Token index to inspect.
 * @returns The number of tokens consumed, or `null` if not matched.
 */
function isLiOpen(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return null;
  if (nameResult.name === "li") {
    return { consumed: 1 + nameResult.consumed };
  }
  return null;
}

/**
 * Tests whether the tokens at `pos` form a `[[/li]]` closing tag.
 *
 * @param ctx - Parse context.
 * @param pos - Token index to inspect.
 * @returns The number of tokens consumed (including BLOCK_CLOSE), or `null`.
 */
function isLiClose(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult || nameResult.name !== "li") return null;
  let consumed = 1 + nameResult.consumed;
  if (ctx.tokens[pos + consumed]?.type === "BLOCK_CLOSE") consumed++;
  return { consumed };
}

/**
 * Block rule for orphaned `[[li]]...[[/li]]` (outside any list block).
 *
 * The opening and closing tags are emitted as literal text elements, and
 * newlines within the body become `<br />` elements. Leading whitespace
 * on each line is discarded.
 */
export const orphanLiRule: BlockRule = {
  name: "orphan-li",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    // Check for [[li]] (not [[li_]])
    const liOpen = isLiOpen(ctx, ctx.pos);
    if (!liOpen) {
      return { success: false };
    }

    let pos = ctx.pos + liOpen.consumed;
    let consumed = liOpen.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Collect content until [[/li]]
    const elements: Element[] = [];
    let foundClose = false;

    // Output [[li]] as text
    elements.push({ element: "text", data: "[[" });
    elements.push({ element: "text", data: "li" });
    elements.push({ element: "text", data: "]]" });

    // Wikidot outputs: [[li]]<br />Baz<br />[[/li]]
    // - Newline after [[li]] becomes <br />
    // - Newline after content becomes <br />
    // - No <br /> right before [[/li]]

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Check for [[/li]] close
      const liClose = isLiClose(ctx, pos);
      if (liClose) {
        foundClose = true;
        // Output [[/li]] as text (no <br /> before it)
        elements.push({ element: "text", data: "[[/" });
        elements.push({ element: "text", data: "li" });
        elements.push({ element: "text", data: "]]" });
        consumed += liClose.consumed;
        pos += liClose.consumed;
        // Skip trailing newline
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }
        break;
      }

      // Handle newlines - convert to <br />
      if (token.type === "NEWLINE") {
        elements.push({ element: "line-break" });
        pos++;
        consumed++;
        continue;
      }

      // Skip leading whitespace on lines
      if (token.type === "WHITESPACE" && token.lineStart) {
        pos++;
        consumed++;
        continue;
      }

      // Other content
      elements.push({ element: "text", data: token.value });
      pos++;
      consumed++;
    }

    // Require closing tag - without it, fail to prevent consuming entire document
    if (!foundClose) {
      return { success: false };
    }

    return {
      success: true,
      elements,
      consumed,
    };
  },
};
