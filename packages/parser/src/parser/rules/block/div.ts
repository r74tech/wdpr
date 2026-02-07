/**
 *
 * Block rule for Wikidot `[[div]]` and `[[div_]]` container blocks.
 *
 * `[[div]]` wraps its body content in a `<div>` element, with full
 * paragraph processing for the body. `[[div_]]` (paragraph strip mode)
 * unwraps the first and last paragraphs so their content appears directly
 * inside the `<div>`, while middle paragraphs keep their `<p>` wrappers.
 *
 * Both variants accept HTML attributes (class, style, id, etc.) on the
 * opening tag.
 *
 * Wikidot-specific edge cases:
 * - The opening `]]` MUST be followed by a NEWLINE for the block to be
 *   recognised. `[[div]]inline[[/div]]` is NOT a valid div -- it becomes
 *   a failed div (see `consumeFailedDiv()`).
 * - When a div fails, everything from the opening `[[div]]` through the
 *   last `[[/div]]` is collected as a single paragraph of text/line-break
 *   elements. Blank lines within that span are silently removed.
 * - `[[div_]]` uses `unwrapEdgeParagraphs()` to strip paragraph
 *   wrappers from the first and last elements.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributes, parseBlocksUntil } from "./utils";

/**
 * Block rule for `[[div]]`/`[[div_]]` container blocks.
 *
 * `requiresLineStart` is `false` because nested `[[div_]]` inside another
 * `[[div_]]` may appear after inline content.
 */
export const divRule: BlockRule = {
  name: "div",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false, // Allow nested [[div_]] inside [[div_]]

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name;
    // Check if it's a div or div_
    if (blockName !== "div" && blockName !== "div_") {
      return { success: false };
    }

    // div_ means paragraph strip (no paragraph wrapping)
    const paragraphStrip = blockName === "div_";

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes
    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Wikidot: [[div]] must be followed by newline to be recognized as block
    // [[div]]inline[[/div]] is NOT recognized as div
    // When this fails, Wikidot consumes everything up to the last [[/div]]
    // as text in a single paragraph (blank lines are ignored)
    if (ctx.tokens[pos]?.type !== "NEWLINE") {
      return consumeFailedDiv(ctx);
    }
    pos++;
    consumed++;

    // Close condition for [[/div]]
    const closeCondition = (checkCtx: ParseContext): boolean => {
      const token = checkCtx.tokens[checkCtx.pos];
      if (token?.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
        if (closeNameResult?.name === "div") {
          return true;
        }
      }
      return false;
    };

    const bodyCtx: ParseContext = { ...ctx, pos };
    let children: Element[];

    if (paragraphStrip) {
      // div_ - parse as blocks, then unwrap first/last paragraphs
      // Wikidot: blank lines create <p> for middle blocks only
      const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;
      children = unwrapEdgeParagraphs(bodyResult.elements);
    } else {
      // div - parse blocks with paragraph wrapping
      const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;
      children = bodyResult.elements;
    }

    // Consume [[/div]]
    if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
      pos++;
      consumed++;
      const closeNameResult = parseBlockName(ctx, pos);
      if (closeNameResult) {
        pos += closeNameResult.consumed;
        consumed += closeNameResult.consumed;
      }
      if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
        pos++;
        consumed++;
      }
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
            type: "div",
            attributes: attrResult.attrs,
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Handles the case where `[[div]]` fails as a block element because
 * the closing `]]` is not followed by a NEWLINE.
 *
 * In Wikidot, this scenario causes the parser to scan forward for the
 * LAST `[[/div]]` in the contiguous token stream and collect everything
 * from the current position through that close tag as a single paragraph.
 * Blank lines (double newlines) within the range are silently collapsed,
 * and single newlines become `<br />`.
 *
 * If no `[[/div]]` is found at all, the rule fails entirely.
 *
 * @param ctx - Parse context, positioned at the opening `[[div...]]` tag.
 * @returns A paragraph container with text/line-break elements, or failure.
 */
function consumeFailedDiv(ctx: ParseContext): RuleResult<Element> {
  const elements: Element[] = [];
  let pos = ctx.pos;
  let consumed = 0;
  let lastClosePos = -1;
  let lastCloseConsumed = 0;

  // Find the last [[/div]] in the contiguous block
  let scanPos = pos;
  while (scanPos < ctx.tokens.length) {
    const t = ctx.tokens[scanPos];
    if (!t || t.type === "EOF") break;
    if (t.type === "BLOCK_END_OPEN") {
      const nameResult = parseBlockName(ctx, scanPos + 1);
      if (nameResult?.name === "div") {
        // Found [[/div]] - record position after ]]
        lastClosePos = scanPos;
        lastCloseConsumed = 1 + nameResult.consumed; // [[/ + div
        const closeToken = ctx.tokens[scanPos + 1 + nameResult.consumed];
        if (closeToken?.type === "BLOCK_CLOSE") {
          lastCloseConsumed++;
        }
      }
    }
    scanPos++;
  }

  if (lastClosePos === -1) {
    // No [[/div]] found, fall back to normal failure
    return { success: false };
  }

  // Consume everything from current position to after the last [[/div]]
  const endPos = lastClosePos + lastCloseConsumed;
  while (pos < endPos && pos < ctx.tokens.length) {
    const t = ctx.tokens[pos];
    if (!t || t.type === "EOF") break;

    if (t.type === "NEWLINE") {
      // Check if this is a blank line (NEWLINE+NEWLINE or NEWLINE+WHITESPACE+NEWLINE)
      let peekPos = pos + 1;
      while (ctx.tokens[peekPos]?.type === "WHITESPACE") peekPos++;
      if (ctx.tokens[peekPos]?.type === "NEWLINE") {
        // Blank line — skip all newlines and whitespace
        while (ctx.tokens[pos]?.type === "NEWLINE" || ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }
        continue;
      }
      // Single newline → line-break
      elements.push({ element: "line-break" });
      pos++;
      consumed++;
      continue;
    }

    elements.push({ element: "text", data: t.value });
    pos++;
    consumed++;
  }

  // Consume trailing newline after [[/div]] if present
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  return {
    success: true,
    elements: [
      {
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements,
        },
      },
    ],
    consumed,
  };
}

/**
 * Implements the `[[div_]]` paragraph-strip behaviour.
 *
 * In Wikidot's `div_` mode, the first and last paragraph containers have
 * their `<p>` wrappers removed, leaving the inner elements bare. Any
 * middle paragraphs retain their wrapping. This produces output where the
 * opening and closing text sit directly inside the `<div>`.
 *
 * @param elements - Block elements produced by body parsing.
 * @returns A new array with edge paragraphs unwrapped.
 */
function unwrapEdgeParagraphs(elements: Element[]): Element[] {
  if (elements.length === 0) return elements;

  const result = [...elements];

  // Unwrap first element if paragraph
  if (isParagraphContainer(result[0])) {
    const inner = (result[0] as any).data.elements as Element[];
    result.splice(0, 1, ...inner);
  }

  // Unwrap last element if paragraph (find new last index after splice)
  const lastIdx = result.length - 1;
  if (lastIdx >= 0 && isParagraphContainer(result[lastIdx])) {
    const inner = (result[lastIdx] as any).data.elements as Element[];
    result.splice(lastIdx, 1, ...inner);
  }

  return result;
}

/**
 * Checks whether an element is a paragraph container
 * (i.e. `{ element: "container", data: { type: "paragraph" } }`).
 *
 * @param el - Element to test, or `undefined`.
 * @returns `true` if the element is a paragraph container.
 */
function isParagraphContainer(el: Element | undefined): boolean {
  return (
    el !== undefined &&
    el.element === "container" &&
    typeof el.data === "object" &&
    el.data !== null &&
    "type" in el.data &&
    el.data.type === "paragraph"
  );
}
