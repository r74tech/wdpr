/**
 * Content separator rule: ==== (4 or more = at line start)
 *
 * Creates a content separator element.
 */
import type { Element } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

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
