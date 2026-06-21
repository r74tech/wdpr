/**
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
 * If no `[[/li]]` closing tag is found, the rule fails.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectOrphanLiContent } from "./content";
import { parseOrphanLiOpen } from "./open";

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

    const openResult = parseOrphanLiOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    const contentResult = collectOrphanLiContent(ctx, openResult.bodyStart);
    let consumed = openResult.consumed;
    consumed += contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/li]] for [[li]]",
        position: openToken.position,
      });
      return { success: false };
    }

    return {
      success: true,
      elements: contentResult.elements,
      consumed,
    };
  },
};
