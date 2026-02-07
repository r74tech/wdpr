/**
 *
 * Parses the Wikidot raw (verbatim) text syntaxes: `@@...@@` and `@<...>@`.
 *
 * Raw text bypasses all inline formatting -- the content between the
 * delimiters is emitted as-is without interpretation of any Wikidot
 * markup characters.
 *
 * Two syntax variants are supported:
 *
 * 1. Double-at syntax (`@@...@@`): The more common form. Content between
 *    the markers is treated as raw text. Several Wikidot quirks apply:
 *    - Empty raw (`@@@@` = two consecutive `RAW_OPEN` tokens) produces
 *      no output
 *    - `@@\n@@` (raw spanning a newline with no content) also produces
 *      no output
 *    - Content containing both `@<` and `>@` is discarded entirely
 *    - `>@` followed immediately by `@@` is split: `>` becomes raw
 *      content, `@@` acts as the closer, and the leftover `@` becomes text
 *
 * 2. Angle-bracket syntax (`@<...>@`): A less common form that also
 *    treats content as raw text. If the closing `>@` is not found on the
 *    same line, `@<` is treated as literal text. The `@<\n>@` spanning
 *    pattern outputs only `@<` as text.
 *
 * Produces a `"raw"` AST element whose `data` field contains the
 * verbatim text string, or empty elements when the raw content is discarded.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";

/**
 * Inline rule for parsing `@@...@@` and `@<...>@` raw (verbatim) text.
 *
 * Triggered by either `RAW_OPEN` (`@@`) or `RAW_BLOCK_OPEN` (`@<`) tokens.
 * Delegates to the appropriate handler based on the opening token type.
 */
export const rawRule: InlineRule = {
  name: "raw",
  startTokens: ["RAW_OPEN", "RAW_BLOCK_OPEN"],

  /**
   * Attempts to parse raw text at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with `"raw"` element(s), text fallback,
   *          or empty elements depending on the variant and content
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Handle @<...>@ syntax
    if (startToken.type === "RAW_BLOCK_OPEN") {
      return parseAngleRaw(ctx);
    }

    // Handle @@...@@ syntax
    return parseDoubleAtRaw(ctx);
  },
};

/**
 * Parses the `@@...@@` double-at raw text syntax.
 *
 * Handles several Wikidot-specific edge cases:
 * - Consecutive `@@@@` (two RAW_OPEN tokens) = empty raw, no output
 * - `@@\n@@` = empty raw spanning newline, no output
 * - Content with both `@<` and `>@` embedded = entirely discarded
 * - `>@` immediately before `@@` = split into raw content + text
 *
 * When no closing `@@` is found on the same line, the opening `@@`
 * is emitted as literal text.
 *
 * @param ctx - Parse context positioned at the opening `@@` token
 * @returns Parse result with raw element(s), empty array, or text fallback
 */
function parseDoubleAtRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  const next1 = ctx.tokens[pos];

  // Wikidot behavior for consecutive @@:
  // @@@@ (RAW_OPEN RAW_OPEN) -> empty raw (no output), rest becomes plain text
  // @@@@@ (5 @s) -> empty raw + @ (text)
  // @@@@@@ (6 @s) -> empty raw + @@ (text)
  // Empty raw produces no output, so we just consume the tokens.
  if (next1?.type === "RAW_OPEN") {
    return {
      success: true,
      elements: [], // Empty raw produces no output
      consumed: 2, // Only consume the two RAW_OPEN tokens (@@@@)
    };
  }

  // Check if closing @@ exists before newline
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_OPEN")) {
    // Special case: @@\n@@ (empty raw spanning newline)
    // Wikidot treats this as an empty raw that produces no output
    const nextToken = ctx.tokens[pos];
    if (nextToken?.type === "NEWLINE") {
      const afterNewline = ctx.tokens[pos + 1];
      if (afterNewline?.type === "RAW_OPEN") {
        // Consume @@, NEWLINE, @@ and produce no output
        return {
          success: true,
          elements: [],
          consumed: 3, // @@ + NEWLINE + @@
        };
      }
    }
    return {
      success: true,
      elements: [{ element: "text", data: startToken.value }],
      consumed: 1,
    };
  }

  // Collect raw content and check for embedded @< and >@
  let value = "";
  let consumed = 1; // opening @@
  let hasBlockOpen = false; // has @<
  let hasBlockClose = false; // has >@

  // In @@...@@ syntax, only RAW_OPEN (@@) acts as closer.
  // Special handling for RAW_BLOCK_CLOSE (>@) followed by RAW_OPEN (@@):
  // Wikidot treats ">@@@" as ">@@" + "@", so we only take ">" and let the
  // @ combine with the following @@ to form the closer.
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "RAW_OPEN" || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    // Check if RAW_BLOCK_CLOSE (>@) is followed by RAW_OPEN (@@)
    // Wikidot interprets ">@@@" as ">" (raw content) + "@@" (closer) + "@" (text)
    // We need to only take ">" and output "@" as trailing text after the raw element
    if (token.type === "RAW_BLOCK_CLOSE") {
      const nextToken = ctx.tokens[pos + 1];
      if (nextToken?.type === "RAW_OPEN") {
        // Only take the ">" part
        value += ">";
        consumed += 2; // Consume both RAW_BLOCK_CLOSE and RAW_OPEN (as closer)
        // Return raw element followed by "@" text (from the >@ token's @)
        return {
          success: true,
          elements: [
            { element: "raw", data: value },
            { element: "text", data: "@" },
          ],
          consumed,
        };
      }
      // Mark that we have embedded >@ (not followed by @@)
      hasBlockClose = true;
    }
    // Track embedded @< token
    if (token.type === "RAW_BLOCK_OPEN") {
      hasBlockOpen = true;
    }
    value += token.value;
    consumed++;
    pos++;
  }

  // Consume closing @@
  if (ctx.tokens[pos]?.type === "RAW_OPEN") {
    consumed++;
    pos++;
  }

  // Wikidot quirk: @@...@@ containing BOTH @< AND >@ is discarded entirely
  // (produces no output, not even text fallback)
  // Having only @< or only >@ is fine - they're treated as raw content.
  if (hasBlockOpen && hasBlockClose) {
    return {
      success: true,
      elements: [],
      consumed,
    };
  }

  return {
    success: true,
    elements: [{ element: "raw", data: value }],
    consumed,
  };
}

/**
 * Parses the `@<...>@` angle-bracket raw text syntax.
 *
 * This is the less common raw text form. Content between `@<` and `>@`
 * is treated as verbatim text.
 *
 * Edge cases:
 * - `@<\n>@` (spanning a newline) outputs only `@<` as text and
 *   consumes all three tokens
 * - No closing `>@` on the same line = `@<` emitted as literal text
 *
 * @param ctx - Parse context positioned at the opening `@<` token
 * @returns Parse result with a raw element or text fallback
 */
function parseAngleRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  // Check if closing >@ exists before newline
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_BLOCK_CLOSE")) {
    // Special case: @<\n>@ (empty raw spanning newline)
    // Wikidot treats @< as text and >@ disappears
    const nextToken = ctx.tokens[pos];
    if (nextToken?.type === "NEWLINE") {
      const afterNewline = ctx.tokens[pos + 1];
      if (afterNewline?.type === "RAW_BLOCK_CLOSE") {
        // Consume @<, NEWLINE, >@ - output only @< as text
        return {
          success: true,
          elements: [{ element: "text", data: startToken.value }],
          consumed: 3, // @< + NEWLINE + >@
        };
      }
    }
    return {
      success: true,
      elements: [{ element: "text", data: startToken.value }],
      consumed: 1,
    };
  }

  // Collect raw content
  let value = "";
  let consumed = 1; // opening @<

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "RAW_BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    value += token.value;
    consumed++;
    pos++;
  }

  // Consume closing >@
  if (ctx.tokens[pos]?.type === "RAW_BLOCK_CLOSE") {
    consumed++;
  }

  return {
    success: true,
    elements: [{ element: "raw", data: value }],
    consumed,
  };
}
