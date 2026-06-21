import type { ParseContext } from "../../types";

export type CollapsibleAttributes = Record<string, string>;

/**
 * Parses collapsible attributes that may be spread across multiple lines.
 */
export function parseMultilineAttributes(
  ctx: ParseContext,
  startPos: number,
): { attrs: CollapsibleAttributes; consumed: number } {
  const attrs: CollapsibleAttributes = {};
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
      break;
    }
  }

  return { attrs, consumed };
}

export interface CollapsibleToggleVisibility {
  showTop: boolean;
  showBottom: boolean;
}

export function resolveToggleVisibility(
  attrs: Record<string, string>,
): CollapsibleToggleVisibility {
  const hideLocation = (attrs.hideLocation ?? attrs.hidelocation ?? "top").toLowerCase();

  if (hideLocation === "both") {
    return { showTop: true, showBottom: true };
  }
  if (hideLocation === "bottom") {
    return { showTop: false, showBottom: true };
  }
  if (hideLocation === "neither" || hideLocation === "none") {
    return { showTop: false, showBottom: false };
  }
  return { showTop: true, showBottom: false };
}
