/**
 *
 * Block rule for the Wikidot bibliography block: `[[bibliography]] ... [[/bibliography]]`.
 *
 * A bibliography block holds labelled citation entries in a definition-list
 * format. Each entry follows the pattern:
 *
 * ```
 * : label : Citation description text
 * ```
 *
 * At render time the entries are cross-referenced with inline `((bibcite label))`
 * markers that appear elsewhere in the document. The parser stores the entries
 * in the AST as a `bibliography-block` element whose `entries` field is an
 * array of {@link DefinitionListItem} objects.
 *
 * Optional attributes on the opening tag:
 * - `title` -- custom heading for the bibliography section.
 * - `hide`  -- when `"true"` or empty string, hides the block from output.
 *
 * If no closing `[[/bibliography]]` tag is found, the rule fails to avoid
 * accidentally consuming the rest of the document.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectBibliographyBody } from "./body";
import { toDefinitionListItems } from "./entries";
import { parseBibliographyOpen } from "./open";

/**
 * Block rule for Wikidot `[[bibliography]]...[[/bibliography]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + block name "bibliography".
 * 2. Parse optional attributes (`title`, `hide`).
 * 3. Consume the closing `]]` and optional newline.
 * 4. Loop over the body, parsing each `: label : content` line via
 *    `parseBibliographyEntry()`.
 * 5. Require and consume `[[/bibliography]]`.
 * 6. Convert entries into {@link DefinitionListItem} format and emit
 *    a `bibliography-block` element.
 */
export const bibliographyRule: BlockRule = {
  name: "bibliography",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseBibliographyOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    const bodyResult = collectBibliographyBody(ctx, openResult.pos);
    const consumed = openResult.consumed + bodyResult.consumed;

    if (!bodyResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/bibliography]] for [[bibliography]]",
        position: openToken.position,
      });
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "bibliography-block",
          data: {
            entries: toDefinitionListItems(bodyResult.entries),
            title: openResult.title,
            hide: openResult.hide,
          },
        },
      ],
      consumed,
    };
  },
};
