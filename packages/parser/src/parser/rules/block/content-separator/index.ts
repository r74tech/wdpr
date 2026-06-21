/**
 *
 * Block rule for the Wikidot content separator: `====` (four or more `=`
 * signs at the start of a line).
 *
 * A content separator is a structural divider in Wikidot pages, distinct
 * from a horizontal rule (`----`). It signals a semantic section boundary
 * rather than a visual line.
 *
 * Conditions:
 * - Must start at line start.
 * - Requires at least four consecutive EQUALS tokens.
 * - Must be followed by NEWLINE or EOF (no trailing text allowed).
 *
 * A single `=` followed by whitespace is the center-alignment rule, and
 * two or three `=` signs are not special -- only four or more trigger this
 * rule.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseContentSeparatorSyntax } from "./syntax";

/**
 * Block rule for the content separator (`====`).
 *
 * Produces a `content-separator` element with no data payload.
 */
export const contentSeparatorRule: BlockRule = {
  name: "content-separator",
  startTokens: ["EQUALS"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const syntax = parseContentSeparatorSyntax(ctx);
    if (!syntax) return { success: false };

    return {
      success: true,
      elements: [
        {
          element: "content-separator",
        },
      ],
      consumed: syntax.consumed,
    };
  },
};
