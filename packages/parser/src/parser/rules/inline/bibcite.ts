/**
 *
 * Parses the Wikidot bibliography citation syntax: `((bibcite label))`.
 *
 * A bibcite creates a numbered inline reference (similar to footnotes)
 * that links to a corresponding entry in a `[[bibliography]]` block
 * elsewhere on the page. The `label` string is used to match the
 * citation with its bibliography entry.
 *
 * Unlike most inline blocks that start with `[[`, bibcite uses double
 * parentheses `((...))` as delimiters. The keyword `bibcite` must
 * appear (case-insensitive) between the opening `((` and the label.
 *
 * Produces a `"bibliography-cite"` AST element. The label is also
 * pushed into `ctx.bibcites` so the renderer can later resolve
 * citation numbers.
 *
 * Wikidot syntax examples:
 * - `((bibcite author2024))` -- cite with label "author2024"
 * - `((bibcite my-source))` -- cite with label "my-source"
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Inline rule for parsing `((bibcite label))` bibliography citations.
 *
 * Triggered by a `TEXT` token (specifically the `(` character). The parser
 * looks for two consecutive `(` tokens, the keyword `bibcite`, the label
 * text, and then two consecutive `)` tokens.
 *
 * The label may span multiple tokens and is trimmed of surrounding whitespace.
 * Parsing fails if the label is empty or if a newline/EOF is encountered
 * before the closing `))`.
 *
 * Side effect: pushes the label into `ctx.bibcites` for later resolution
 * during rendering.
 */
export const bibciteRule: InlineRule = {
  name: "bibcite",
  startTokens: ["TEXT"],

  /**
   * Attempts to parse a `((bibcite label))` citation at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"bibliography-cite"` element, or `{ success: false }`
   */
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
    if (
      !nameToken ||
      nameToken.type !== "IDENTIFIER" ||
      nameToken.value.toLowerCase() !== "bibcite"
    ) {
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
    let foundClose = false;
    while (pos < ctx.tokens.length) {
      const t = ctx.tokens[pos];
      if (!t) break;

      // Check for ))
      if (t.type === "TEXT" && t.value === ")") {
        const nextT = ctx.tokens[pos + 1];
        if (nextT?.type === "TEXT" && nextT.value === ")") {
          // Found closing ))
          consumed += 2;
          foundClose = true;
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

    if (!foundClose) {
      return { success: false };
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
