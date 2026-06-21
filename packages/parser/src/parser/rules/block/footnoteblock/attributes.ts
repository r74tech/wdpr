import type { ParseContext } from "../../types";

export interface FootnoteBlockAttributesResult {
  attrs: Record<string, string>;
  consumed: number;
}

/**
 * Parses key/value attributes from tokens for `[[footnoteblock]]`.
 *
 * This is intentionally rule-local: the generic block attribute parser
 * filters some names that this rule needs to preserve, notably `hide`.
 */
export function parseFootnoteBlockAttributes(
  ctx: ParseContext,
  startPos: number,
): FootnoteBlockAttributesResult {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }

    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      const name = token.value.toLowerCase();
      pos++;
      consumed++;

      const eqToken = ctx.tokens[pos];
      if (eqToken?.type === "EQUALS") {
        pos++;
        consumed++;

        const valueToken = ctx.tokens[pos];
        if (valueToken?.type === "QUOTED_STRING") {
          attrs[name] = stripQuotes(valueToken.value);
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
      pos++;
      consumed++;
    }
  }

  return { attrs, consumed };
}

function stripQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}
