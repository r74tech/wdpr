/**
 * Bibliography block rule: [[bibliography]] ... [[/bibliography]]
 *
 * Contains definition list items that define bibliography entries.
 * Format inside:
 *   : label : Citation text
 *
 * Works with ((bibcite label)) inline elements.
 */
import type { Element, DefinitionListItem } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributes } from "./utils";
import { parseInlineUntil } from "../inline/utils";

interface BibliographyEntry {
  label: string;
  key: Element[];
  content: Element[];
}

/**
 * Parse a single bibliography entry
 * Format: : label : content
 */
function parseBibliographyEntry(
  ctx: ParseContext,
  startPos: number,
): { entry: BibliographyEntry; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Expect COLON at line start
  const colonToken = ctx.tokens[pos];
  if (!colonToken || colonToken.type !== "COLON" || !colonToken.lineStart) {
    return null;
  }
  pos++;
  consumed++;

  // Wikidot requires whitespace after first colon
  const whitespaceAfterColon = ctx.tokens[pos];
  if (!whitespaceAfterColon || whitespaceAfterColon.type !== "WHITESPACE") {
    return null;
  }

  // Skip whitespace after first colon
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  // Collect label tokens until second COLON
  let label = "";
  let foundSecondColon = false;
  const keyNodes: Element[] = [];

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

    // For bibliography, key is just the label (identifier)
    label += token.value;
    keyNodes.push({ element: "text", data: token.value });
    pos++;
    consumed++;
  }

  if (!foundSecondColon) {
    return null;
  }

  label = label.trim();

  // Skip whitespace after second colon
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  // Parse content (rest of line, can continue with line breaks)
  const contentNodes: Element[] = [];
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check for [[/bibliography]]
    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult?.name === "bibliography") {
        break;
      }
    }

    // Check for end of entry (newline followed by new entry or end)
    if (token.type === "NEWLINE") {
      const nextToken = ctx.tokens[pos + 1];
      // Look ahead for new entry or block end
      if (nextToken?.type === "COLON" && nextToken.lineStart) {
        // New entry starts
        pos++;
        consumed++;
        break;
      }
      if (nextToken?.type === "BLOCK_END_OPEN") {
        // Block end
        pos++;
        consumed++;
        break;
      }
      if (nextToken?.type === "NEWLINE" || !nextToken || nextToken.type === "EOF") {
        // Double newline or end
        pos++;
        consumed++;
        break;
      }
      // Single newline - continue (becomes line break)
    }

    // Parse inline content
    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "NEWLINE");
    if (result.elements.length > 0) {
      contentNodes.push(...result.elements);
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      pos++;
      consumed++;
    }
  }

  // Trim key nodes
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
    entry: {
      label,
      key: keyNodes,
      content: contentNodes,
    },
    consumed,
  };
}

export const bibliographyRule: BlockRule = {
  name: "bibliography",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "bibliography") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse optional attributes (title, hide)
    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip newline after opening tag
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Parse bibliography entries
    const entries: BibliographyEntry[] = [];

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/bibliography]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name === "bibliography") {
          // Consume [[/bibliography]]
          pos++;
          consumed++;
          pos += closeNameResult.consumed;
          consumed += closeNameResult.consumed;
          // Skip whitespace
          while (ctx.tokens[pos]?.type === "WHITESPACE") {
            pos++;
            consumed++;
          }
          // Expect ]]
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Skip whitespace and newlines
      if (token.type === "WHITESPACE" || token.type === "NEWLINE") {
        pos++;
        consumed++;
        continue;
      }

      // Parse entry
      if (token.type === "COLON" && token.lineStart) {
        const result = parseBibliographyEntry(ctx, pos);
        if (result) {
          entries.push(result.entry);
          pos += result.consumed;
          consumed += result.consumed;
          continue;
        }
      }

      // Skip unknown tokens
      pos++;
      consumed++;
    }

    // Convert to definition list format for AST storage
    const definitionItems: DefinitionListItem[] = entries.map((entry) => ({
      key_string: entry.label,
      key: entry.key,
      value: entry.content,
    }));

    // Get attributes
    const title = attrResult.attrs.title ?? null;
    const hide = attrResult.attrs.hide === "true" || attrResult.attrs.hide === "";

    return {
      success: true,
      elements: [
        {
          element: "bibliography-block",
          data: {
            entries: definitionItems,
            title: typeof title === "string" ? title : null,
            hide,
          },
        },
      ],
      consumed,
    };
  },
};
