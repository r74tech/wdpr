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
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

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
    const first = currentToken(ctx);

    if (!first.lineStart) {
      return { success: false };
    }

    // Count consecutive = tokens at line start
    let pos = ctx.pos;
    let equalsCount = 0;

    while (ctx.tokens[pos]?.type === "EQUALS") {
      equalsCount++;
      pos++;
    }

    // Need at least 4 equals signs for content separator
    if (equalsCount < 4) {
      return { success: false };
    }

    // Must be followed by newline or EOF
    const nextToken = ctx.tokens[pos];
    if (nextToken && nextToken.type !== "NEWLINE" && nextToken.type !== "EOF") {
      return { success: false };
    }

    let consumed = equalsCount;

    // Consume newline if present
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      consumed++;
    }

    return {
      success: true,
      elements: [
        {
          element: "content-separator",
        },
      ],
      consumed,
    };
  },
};
