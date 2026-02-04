/**
 * Bibcite rule: ((bibcite label))
 *
 * Creates a citation reference that links to a bibliography entry.
 * The label is used to match with [[bibliography]] entries.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

export const bibciteRule: InlineRule = {
  name: "bibcite",
  startTokens: ["TEXT"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    // Must start with (
    if (token.type !== "TEXT" || token.value !== "(") {
      return { success: false };
    }

    // Check for second (
    const nextToken = ctx.tokens[ctx.pos + 1];
    if (!nextToken || nextToken.type !== "TEXT" || nextToken.value !== "(") {
      return { success: false };
    }

    // Check for "bibcite" identifier
    let pos = ctx.pos + 2;
    let consumed = 2;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    const nameToken = ctx.tokens[pos];
    if (!nameToken || nameToken.type !== "IDENTIFIER" || nameToken.value.toLowerCase() !== "bibcite") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse label (identifier or text)
    const labelToken = ctx.tokens[pos];
    if (!labelToken || (labelToken.type !== "IDENTIFIER" && labelToken.type !== "TEXT")) {
      return { success: false };
    }

    // Collect label (may span multiple tokens until ))
    let label = "";
    while (pos < ctx.tokens.length) {
      const t = ctx.tokens[pos];
      if (!t) break;

      // Check for ))
      if (t.type === "TEXT" && t.value === ")") {
        const nextT = ctx.tokens[pos + 1];
        if (nextT?.type === "TEXT" && nextT.value === ")") {
          // Found closing ))
          consumed += 2;
          break;
        }
      }

      // Stop at newline or EOF
      if (t.type === "NEWLINE" || t.type === "EOF") {
        return { success: false };
      }

      label += t.value;
      pos++;
      consumed++;
    }

    label = label.trim();
    if (!label) {
      return { success: false };
    }

    // Store bibcite reference in context for later resolution
    ctx.bibcites.push(label);

    return {
      success: true,
      elements: [
        {
          element: "bibliography-cite",
          data: {
            label,
            brackets: false, // Wikidot adds brackets in output but they're not in the AST
          },
        },
      ],
      consumed,
    };
  },
};
