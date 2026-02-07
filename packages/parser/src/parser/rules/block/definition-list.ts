/**
 * @module definition-list
 *
 * Block rule for Wikidot definition lists written with the `: key : value` syntax.
 *
 * Each item starts at the beginning of a line with a COLON, followed by
 * mandatory whitespace, the key (term), a second COLON, and then the value
 * (definition). Multiple consecutive items form a single `<dl>` block.
 *
 * ```
 * : Apple : A fruit that grows on trees.
 * : Banana : A yellow curved fruit.
 * ```
 *
 * Key parsing details:
 * - Whitespace after the first colon is required (`": key"` not `":key"`).
 * - The key portion supports inline markup (bold, links, etc.).
 * - The value continues until a double newline, a new definition entry, or
 *   the end of the document.
 * - A single newline within the value does NOT break the entry -- parsing
 *   continues on the next line.
 */
import type { Element, DefinitionListItem } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { parseInlineUntil } from "../inline/utils";

/**
 * Internal representation of one definition list item before conversion
 * to the AST's {@link DefinitionListItem} format.
 */
interface ParsedDefinitionItem {
  /** Raw string of the key, used for `key_string` in the AST. */
  keyString: string;
  /** Parsed inline elements representing the key / term. */
  key: Element[];
  /** Parsed inline elements representing the value / definition. */
  value: Element[];
}

/**
 * Parses a single definition list entry of the form `: key : value`.
 *
 * The function expects `startPos` to point at a line-start COLON token.
 * It consumes the first colon, mandatory whitespace, key tokens up to
 * the second colon, then value tokens until one of the following:
 * - A double newline (paragraph break).
 * - A new entry (COLON at line start).
 * - End of input.
 *
 * The key is parsed for inline content using {@link parseInlineUntil}
 * (stopping at COLON), and the value uses the same utility (stopping at
 * NEWLINE).
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index of the expected line-start COLON.
 * @returns The parsed item and token count, or `null` on failure.
 */
function parseDefinitionItem(
  ctx: ParseContext,
  startPos: number,
): { item: ParsedDefinitionItem; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Expect COLON at line start
  const colonToken = ctx.tokens[pos];
  if (!colonToken || colonToken.type !== "COLON" || !colonToken.lineStart) {
    return null;
  }
  pos++;
  consumed++;

  // Wikidot requires whitespace after first colon: ": key : value"
  const whitespaceAfterColon = ctx.tokens[pos];
  if (!whitespaceAfterColon || whitespaceAfterColon.type !== "WHITESPACE") {
    return null;
  }

  // Skip whitespace after first colon
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  // Collect key tokens until second COLON
  const keyTokens: string[] = [];
  const keyNodes: Element[] = [];
  let foundSecondColon = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    if (token.type === "COLON") {
      foundSecondColon = true;
      pos++;
      consumed++;
      break;
    }

    // Parse inline content for key
    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "COLON");
    if (result.elements.length > 0) {
      keyNodes.push(...result.elements);
      // Collect raw key string
      for (let i = 0; i < result.consumed; i++) {
        const t = ctx.tokens[pos + i];
        if (t) keyTokens.push(t.value);
      }
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      keyTokens.push(token.value);
      pos++;
      consumed++;
    }
  }

  if (!foundSecondColon) {
    return null;
  }

  // Skip whitespace after second colon
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  // Parse value (rest of line, can continue with line breaks)
  const valueNodes: Element[] = [];
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check for end of definition (double newline or new definition)
    if (token.type === "NEWLINE") {
      const nextToken = ctx.tokens[pos + 1];
      // Look ahead for continuation with underscore line break
      if (nextToken?.type === "COLON" && nextToken.lineStart) {
        // New definition item starts
        pos++;
        consumed++;
        break;
      }
      if (nextToken?.type === "NEWLINE" || !nextToken || nextToken.type === "EOF") {
        // Double newline or end - stop
        pos++;
        consumed++;
        break;
      }
      // Single newline - continue parsing (becomes line break)
    }

    // Parse inline content
    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "NEWLINE");
    if (result.elements.length > 0) {
      valueNodes.push(...result.elements);
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      pos++;
      consumed++;
    }
  }

  // Remove trailing whitespace from key
  const keyString = keyTokens.join("").trim();

  // Remove trailing whitespace nodes from key
  while (keyNodes.length > 0) {
    const lastNode = keyNodes[keyNodes.length - 1];
    if (
      lastNode &&
      lastNode.element === "text" &&
      typeof lastNode.data === "string" &&
      lastNode.data.trim() === ""
    ) {
      keyNodes.pop();
    } else {
      break;
    }
  }

  return {
    item: {
      keyString,
      key: keyNodes,
      value: valueNodes,
    },
    consumed,
  };
}

/**
 * Block rule for Wikidot definition lists (`: key : value`).
 *
 * Parsing strategy:
 * 1. Verify the first token is a line-start COLON.
 * 2. Repeatedly call {@link parseDefinitionItem} to collect entries.
 * 3. Stop when the current token is no longer a line-start COLON (i.e.
 *    the definition list block has ended).
 * 4. Convert internal items into the AST {@link DefinitionListItem} format.
 * 5. Emit a single `definition-list` element.
 */
export const definitionListRule: BlockRule = {
  name: "definitionList",
  startTokens: ["COLON"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const items: ParsedDefinitionItem[] = [];
    let pos = ctx.pos;
    let totalConsumed = 0;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Only parse lines starting with :
      if (token.type !== "COLON" || !token.lineStart) {
        break;
      }

      const result = parseDefinitionItem(ctx, pos);
      if (!result) {
        break;
      }

      items.push(result.item);
      pos += result.consumed;
      totalConsumed += result.consumed;

      // Skip any whitespace between items
      while (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        totalConsumed++;
      }
    }

    if (items.length === 0) {
      return { success: false };
    }

    // Convert items to DefinitionListItem format
    const definitionItems: DefinitionListItem[] = items.map((item) => ({
      key_string: item.keyString,
      key: item.key,
      value: item.value,
    }));

    return {
      success: true,
      elements: [
        {
          element: "definition-list",
          data: definitionItems,
        },
      ],
      consumed: totalConsumed,
    };
  },
};
