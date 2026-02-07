/**
 *
 * Block rule for Wikidot alignment containers.
 *
 * Wikidot provides a shorthand bracket syntax for wrapping content in a
 * directional alignment container:
 *
 * ```
 * [[>]]        ... [[/>]]        right-aligned
 * [[<]]        ... [[/<]]        left-aligned
 * [[=]]        ... [[/=]]        center-aligned
 * [[==]]       ... [[/==]]       justify-aligned
 * ```
 *
 * Each pair acts as a block-level wrapper. The opening tag must appear at
 * the start of a line and be followed by a newline. Body content is parsed
 * recursively as block-level markup, and the matching closing tag terminates
 * the container.
 *
 * The resulting AST node is a generic container element whose `type` field
 * carries the alignment direction (e.g. `{ align: "right" }`).
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlocksUntil } from "./utils";

/** The four text-alignment directions Wikidot supports. */
type AlignDirection = "left" | "right" | "center" | "justify";

/**
 * Attempts to parse the interior of an align opening tag starting after
 * the BLOCK_OPEN (`[[`) token.
 *
 * The function inspects the token(s) immediately following `[[` to determine
 * which alignment direction is requested:
 *
 * | Tokens after `[[`    | Direction   |
 * |----------------------|-------------|
 * | `>` `]]`             | right       |
 * | `<` `]]`             | left        |
 * | `=` `]]`             | center      |
 * | `=` `=` `]]`         | justify     |
 *
 * The `>` character may arrive as either a BLOCKQUOTE_MARKER (when the
 * line starts with `[[`) or as a TEXT token (when it does not).
 *
 * @param ctx - Current parse context.
 * @param pos - Token index right after the BLOCK_OPEN token.
 * @returns The detected direction and how many tokens were consumed,
 *          or `null` if the tokens do not form a valid align open tag.
 */
function parseAlignOpen(
  ctx: ParseContext,
  pos: number,
): { direction: AlignDirection; consumed: number } | null {
  const tokens = ctx.tokens;

  // After BLOCK_OPEN, expect specific patterns
  const firstToken = tokens[pos];
  if (!firstToken) return null;

  // [[>]] - right
  if (
    firstToken.type === "BLOCKQUOTE_MARKER" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  // Also handle TEXT ">" for non-line-start cases
  if (
    firstToken.type === "TEXT" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  // [[<]] - left (LEFT_DOUBLE_ANGLE might be tokenized, but usually it's after [[)
  if (
    firstToken.type === "TEXT" &&
    firstToken.value === "<" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "left", consumed: 2 };
  }

  // [[=]] - center (single =)
  if (firstToken.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
    return { direction: "center", consumed: 2 };
  }

  // [[==]] - justify (double =)
  if (
    firstToken.type === "EQUALS" &&
    tokens[pos + 1]?.type === "EQUALS" &&
    tokens[pos + 2]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "justify", consumed: 3 };
  }

  return null;
}

/**
 * Tests whether the tokens at the current position form a closing align
 * tag (`[[/> ]]`, `[[/< ]]`, `[[/= ]]`, or `[[/== ]]`) that matches
 * the given direction.
 *
 * The closing tag always starts with a BLOCK_END_OPEN token (`[[/`)
 * followed by the same symbol(s) as the opening tag plus BLOCK_CLOSE.
 *
 * @param ctx       - Current parse context (reads from `ctx.pos`).
 * @param direction - The alignment direction of the currently open block,
 *                    used to select the expected closing pattern.
 * @returns An object with `match` (whether the close tag was found) and
 *          `consumed` (number of tokens the closing tag occupies).
 */
function isAlignClose(
  ctx: ParseContext,
  direction: AlignDirection,
): { match: boolean; consumed: number } {
  const tokens = ctx.tokens;
  let pos = ctx.pos;

  if (tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return { match: false, consumed: 0 };
  }
  pos++;

  // [[/>]] - right
  if (direction === "right") {
    if (
      (tokens[pos]?.type === "BLOCKQUOTE_MARKER" || tokens[pos]?.type === "TEXT") &&
      tokens[pos]?.value === ">" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  // [[/<]] - left
  if (direction === "left") {
    if (
      tokens[pos]?.type === "TEXT" &&
      tokens[pos]?.value === "<" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  // [[/=]] - center
  if (direction === "center") {
    if (tokens[pos]?.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
      return { match: true, consumed: 3 };
    }
  }

  // [[/==]] - justify
  if (direction === "justify") {
    if (
      tokens[pos]?.type === "EQUALS" &&
      tokens[pos + 1]?.type === "EQUALS" &&
      tokens[pos + 2]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 4 };
    }
  }

  return { match: false, consumed: 0 };
}

/**
 * Block rule that matches Wikidot directional alignment containers.
 *
 * Parsing strategy:
 * 1. Verify the first token is BLOCK_OPEN at line start.
 * 2. Delegate to `parseAlignOpen()` to identify direction and consume
 *    the opening tag interior.
 * 3. Require a NEWLINE immediately after the opening tag.
 * 4. Recursively parse body blocks via `parseBlocksUntil()`, stopping
 *    when `isAlignClose()` finds the matching closing tag.
 * 5. Consume the closing tag and optional trailing newline.
 * 6. Emit a container element with `type: { align: direction }`.
 *
 * `preservesPrecedingLineBreak` is `true` because, unlike most block
 * constructs, an alignment block does not suppress a preceding `\n` from
 * becoming a `<br />` in Wikidot's output.
 */
export const alignRule: BlockRule = {
  name: "align",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,
  preservesPrecedingLineBreak: true,

  isStartPattern(ctx: ParseContext, pos: number): boolean {
    if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return false;
    return parseAlignOpen(ctx, pos + 1) !== null;
  },

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse align open syntax
    const alignResult = parseAlignOpen(ctx, pos);
    if (!alignResult) {
      return { success: false };
    }

    const { direction } = alignResult;
    pos += alignResult.consumed;
    consumed += alignResult.consumed;

    // Must be followed by newline
    if (ctx.tokens[pos]?.type !== "NEWLINE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Close condition
    const closeCondition = (checkCtx: ParseContext): boolean => {
      return isAlignClose(checkCtx, direction).match;
    };

    // Parse body
    const bodyCtx: ParseContext = { ...ctx, pos };
    const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
    consumed += bodyResult.consumed;
    pos += bodyResult.consumed;

    // Consume closing tag
    const closeCheck = isAlignClose({ ...ctx, pos }, direction);
    if (closeCheck.match) {
      consumed += closeCheck.consumed;
      pos += closeCheck.consumed;

      // Consume trailing newline
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: { align: direction },
            attributes: {},
            elements: bodyResult.elements,
          },
        },
      ],
      consumed,
    };
  },
};
