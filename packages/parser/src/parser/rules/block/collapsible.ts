/**
 * Block rule for Wikidot collapsible blocks: `[[collapsible]]...[[/collapsible]]`.
 *
 * A collapsible renders as a show/hide toggle with body content that can
 * be expanded or collapsed. The opening tag accepts several attributes
 * (which may span multiple lines):
 *
 * - `show`           -- label text for the "show" link (default: "+ show block").
 * - `hide`           -- label text for the "hide" link (default: "- hide block").
 * - `folded`         -- when `"no"`, the block starts in the expanded state.
 * - `hideLocation`   -- where the toggle link appears: `"top"` (default),
 *                       `"bottom"`, `"both"`, or `"neither"`/`"none"`.
 *
 * Key Wikidot-specific behaviours:
 * - Collapsibles cannot nest. When the body parser encounters a second
 *   `[[collapsible]]`, it is treated as plain text. This is achieved by
 *   filtering the collapsible rule out of the block rule list for body parsing.
 * - Orphaned `[[/collapsible]]` tags after the matched close are consumed and
 *   emitted as `<br />` + literal text, matching Wikidot rendering.
 * - An inline form (`[[collapsible]]text[[/collapsible]]` on one line) is
 *   supported but uncommon.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseBlocksUntil } from "./utils";

/**
 * Parses block attributes that may be spread across multiple lines.
 *
 * Unlike the standard {@link parseAttributes}, this variant allows NEWLINE
 * tokens between attribute pairs, which Wikidot permits for `[[collapsible]]`
 * tags with many attributes.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index to start scanning.
 * @returns Parsed key/value pairs and the number of tokens consumed.
 */
function parseMultilineAttributes(
  ctx: ParseContext,
  startPos: number,
): { attrs: Record<string, string>; consumed: number } {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE" || token.type === "EOF") {
      break;
    }

    if (token.type === "WHITESPACE" || token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      let name = token.value;
      pos++;
      consumed++;

      // Handle hyphenated names (e.g. "hide-location")
      while (
        ctx.tokens[pos]?.type === "TEXT" &&
        ctx.tokens[pos]?.value === "-" &&
        (ctx.tokens[pos + 1]?.type === "IDENTIFIER" || ctx.tokens[pos + 1]?.type === "TEXT")
      ) {
        name += "-";
        pos++;
        consumed++;
        name += ctx.tokens[pos]?.value ?? "";
        pos++;
        consumed++;
      }

      const eqToken = ctx.tokens[pos];
      if (eqToken?.type === "EQUALS") {
        pos++;
        consumed++;
        const valueToken = ctx.tokens[pos];
        if (valueToken?.type === "QUOTED_STRING") {
          let value = valueToken.value;
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          attrs[name] = value;
          pos++;
          consumed++;
        } else if (valueToken?.type === "TEXT" || valueToken?.type === "IDENTIFIER") {
          attrs[name] = valueToken.value;
          pos++;
          consumed++;
        }
      } else {
        attrs[name] = "true";
      }
    } else {
      // Unknown token type in attribute context, stop
      break;
    }
  }

  return { attrs, consumed };
}

/**
 * Tests whether the tokens at `pos` form a `[[/collapsible]]` closing tag.
 *
 * @param ctx - Parse context.
 * @param pos - Token index to inspect.
 * @returns `true` if the closing tag is found.
 */
function isCollapsibleClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  return nameResult?.name === "collapsible";
}

/**
 * Counts the number of tokens occupied by the `[[/collapsible]]` closing
 * tag, including the optional trailing NEWLINE.
 *
 * @param ctx - Parse context.
 * @param pos - Token index at the BLOCK_END_OPEN.
 * @returns Total token count of the closing tag.
 */
function consumeCloseTag(ctx: ParseContext, pos: number): number {
  let closeConsumed = 1; // BLOCK_END_OPEN
  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult) closeConsumed += nameResult.consumed;
  if (ctx.tokens[pos + closeConsumed]?.type === "BLOCK_CLOSE") closeConsumed++;
  if (ctx.tokens[pos + closeConsumed]?.type === "NEWLINE") closeConsumed++;
  return closeConsumed;
}

/**
 * Merges consecutive paragraph containers that were split by unrecognised
 * block tokens back into the preceding paragraph.
 *
 * When a `[[collapsible]]` token appears inside a collapsible body (the rule
 * is filtered out to prevent nesting), the paragraph parser treats the
 * `BLOCK_OPEN` as a paragraph boundary, splitting content that Wikidot keeps
 * in a single paragraph. This function detects those artificial splits —
 * paragraphs whose first text element is `"[["` — and merges them back,
 * inserting a line-break between runs.
 *
 * Paragraphs separated by blank lines (double newline) do NOT start with
 * `"[["` and are therefore left as separate paragraphs.
 */
function mergeSplitParagraphs(elements: Element[]): Element[] {
  const result: Element[] = [];

  for (const elem of elements) {
    if (
      elem.element !== "container" ||
      !elem.data ||
      typeof elem.data !== "object" ||
      !("type" in elem.data) ||
      elem.data.type !== "paragraph" ||
      !("elements" in elem.data) ||
      !Array.isArray(elem.data.elements)
    ) {
      result.push(elem);
      continue;
    }

    // Check if this paragraph starts with "[[" (unrecognised block token)
    const firstElem = elem.data.elements[0];
    const startsWithBlockOpen =
      firstElem?.element === "text" &&
      typeof firstElem.data === "string" &&
      firstElem.data === "[[";

    if (!startsWithBlockOpen) {
      result.push(elem);
      continue;
    }

    // Try to merge into the previous paragraph
    const prev = result[result.length - 1];
    if (
      prev?.element === "container" &&
      prev.data &&
      typeof prev.data === "object" &&
      "type" in prev.data &&
      prev.data.type === "paragraph" &&
      "elements" in prev.data &&
      Array.isArray(prev.data.elements)
    ) {
      prev.data.elements.push({ element: "line-break" });
      prev.data.elements.push(...elem.data.elements);
    } else {
      result.push(elem);
    }
  }

  return result;
}

/**
 * Block rule for `[[collapsible ...]]...[[/collapsible]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "collapsible".
 * 2. Parse multiline attributes (show, hide, folded, hideLocation, etc.).
 * 3. If a NEWLINE follows the opening tag, parse body as block content
 *    with the collapsible rule itself removed (to prevent nesting).
 *    Otherwise, parse inline content until close tag or end of line
 *    (inline form).
 * 4. Consume the `[[/collapsible]]` closing tag.
 * 5. Consume any orphaned `[[/collapsible]]` tags that follow, converting
 *    them to `<br />` + literal text.
 * 6. Derive `show-top` / `show-bottom` booleans from the `hideLocation`
 *    attribute.
 */
export const collapsibleRule: BlockRule = {
  name: "collapsible",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "collapsible") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    const attrResult = parseMultilineAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Record opening tag position for diagnostics
    const openPosition = openToken.position;

    const hasNewlineAfterOpen = ctx.tokens[pos]?.type === "NEWLINE";
    if (hasNewlineAfterOpen) {
      pos++;
      consumed++;
    }

    let bodyElements: Element[];

    if (
      !hasNewlineAfterOpen &&
      ctx.tokens[pos]?.type !== "EOF" &&
      ctx.tokens[pos]?.type !== "BLOCK_END_OPEN"
    ) {
      // Inline form: [[collapsible]]content[[/collapsible]] on same line
      // Parse inline content until [[/collapsible]] or NEWLINE
      const inlineElements: Element[] = [];
      let inlineConsumed = 0;
      let inlinePos = pos;

      while (inlinePos < ctx.tokens.length) {
        const token = ctx.tokens[inlinePos];
        if (!token || token.type === "EOF" || token.type === "NEWLINE") break;
        if (isCollapsibleClose(ctx, inlinePos)) break;
        inlineElements.push({ element: "text", data: token.value });
        inlinePos++;
        inlineConsumed++;
      }

      consumed += inlineConsumed;
      pos += inlineConsumed;

      if (inlineElements.length > 0) {
        bodyElements = [
          {
            element: "container",
            data: {
              type: "paragraph",
              attributes: {},
              elements: inlineElements,
            },
          },
        ];
      } else {
        bodyElements = [];
      }
    } else {
      // Block form: parse content recursively until [[/collapsible]]
      // Collapsible cannot be nested in Wikidot - nested [[collapsible]] becomes plain text
      const bodyCtx: ParseContext = {
        ...ctx,
        pos,
        blockRules: ctx.blockRules.filter((r) => r.name !== "collapsible"),
      };

      const closeCondition = (checkCtx: ParseContext): boolean => {
        return isCollapsibleClose(checkCtx, checkCtx.pos);
      };

      const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;

      // Merge paragraphs that were artificially split by unrecognised
      // [[collapsible]] tokens (nested collapsible is treated as plain text)
      bodyElements = mergeSplitParagraphs(bodyResult.elements);
    }

    // Check for missing close tag
    if (!isCollapsibleClose(ctx, pos)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/collapsible]] for [[collapsible]]",
        position: openPosition,
      });
    }

    // Consume [[/collapsible]]
    if (isCollapsibleClose(ctx, pos)) {
      const closeConsumed = consumeCloseTag(ctx, pos);
      consumed += closeConsumed;
      pos += closeConsumed;
    }

    // Consume orphaned [[/collapsible]] after the block
    // Wikidot renders these as bare <br />[[/collapsible]] (no <p> wrapper)
    const orphanedElements: Element[] = [];
    while (isCollapsibleClose(ctx, pos)) {
      orphanedElements.push({ element: "line-break" });

      // Convert tokens of [[/collapsible]] to text
      while (pos < ctx.tokens.length) {
        const t = ctx.tokens[pos];
        if (!t || t.type === "NEWLINE" || t.type === "EOF") break;
        orphanedElements.push({ element: "text", data: t.value });
        consumed++;
        pos++;
      }

      // Skip trailing NEWLINE
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        consumed++;
        pos++;
      }
    }

    // Determine show-top/show-bottom from hideLocation attribute
    const hideLocation = (
      attrResult.attrs.hideLocation ??
      attrResult.attrs.hidelocation ??
      "top"
    ).toLowerCase();
    let showTop = true;
    let showBottom = false;
    if (hideLocation === "both") {
      showTop = true;
      showBottom = true;
    } else if (hideLocation === "bottom") {
      showTop = false;
      showBottom = true;
    } else if (hideLocation === "neither" || hideLocation === "none") {
      showTop = false;
      showBottom = false;
    }

    return {
      success: true,
      elements: [
        {
          element: "collapsible",
          data: {
            elements: bodyElements,
            attributes: {},
            "start-open": attrResult.attrs.folded === "no",
            "show-text": attrResult.attrs.show ?? null,
            "hide-text": attrResult.attrs.hide ?? null,
            "show-top": showTop,
            "show-bottom": showBottom,
          },
        },
        ...orphanedElements,
      ],
      consumed,
    };
  },
};
