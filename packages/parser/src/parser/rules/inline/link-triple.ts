import type { Element, LinkType, LinkLocation, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Check if there's a LINK_CLOSE (]]]) ahead, allowing newlines in specific cases
 * Wikidot allows multi-line links like [[[page |\nLabel]]]
 * But rejects [[[page\n]]] (newline directly before close)
 */
function hasClosingLinkMarker(ctx: ParseContext, startPos: number): boolean {
  let pos = startPos;
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      return false;
    }
    if (token.type === "LINK_CLOSE") {
      return true;
    }
    // Allow at most one newline, but not directly before LINK_CLOSE
    if (token.type === "NEWLINE") {
      const next = ctx.tokens[pos + 1];
      if (next?.type === "NEWLINE") {
        return false; // Double newline = paragraph break
      }
      // Newline directly before close = invalid
      if (next?.type === "LINK_CLOSE") {
        return false;
      }
    }
    pos++;
  }
  return false;
}

export const linkTripleRule: InlineRule = {
  name: "linkTriple",
  startTokens: ["LINK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    if (!hasClosingLinkMarker(ctx, ctx.pos + 1)) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Collect tokens until LINK_CLOSE (allowing single newline)
    let target = "";
    let labelText = "";
    let foundPipe = false;
    let consumed = 1; // opening [[[
    let pos = ctx.pos + 1;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "LINK_CLOSE" || token.type === "EOF") {
        break;
      }

      // Skip newlines in link content (Wikidot allows this)
      if (token.type === "NEWLINE") {
        consumed++;
        pos++;
        continue;
      }

      if (token.type === "PIPE" && !foundPipe) {
        foundPipe = true;
      } else if (foundPipe) {
        labelText += token.value;
      } else {
        target += token.value;
      }

      consumed++;
      pos++;
    }

    // Consume closing ]]]
    if (ctx.tokens[pos]?.type === "LINK_CLOSE") {
      consumed++;
    }

    const trimmedTarget = target.trim();

    // Invalid: empty target with pipe (e.g., [[[|some-page]]])
    if (trimmedTarget === "" && foundPipe) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Invalid: multiple consecutive # in target (e.g., [[[home###|Home]]], [[[page##anchor]]])
    // Wikidot rejects these as invalid link syntax
    if (/#{2,}/.test(trimmedTarget)) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Special case: [[[*|label]]] means link to root "/" with label
    let finalTarget = trimmedTarget;
    let labelPrefix = "";
    if (trimmedTarget === "*" && foundPipe) {
      finalTarget = "";
    }
    // Special case: [[[*page]]] - * is a label prefix, page is the target
    if (trimmedTarget.startsWith("*") && !foundPipe) {
      labelPrefix = "*";
      finalTarget = trimmedTarget.slice(1);
    }

    const { linkType, link } = determineLinkTypeAndLocation(finalTarget);
    const trimmedLabel = labelText.trim();

    // Determine display text
    let displayText: string;
    if (foundPipe) {
      // If label is empty (e.g., [[[page|]]]), use page name
      displayText = trimmedLabel || finalTarget;
    } else {
      // For category pages (system:Recent Changes), use only the part after colon
      const colonIdx = trimmedTarget.indexOf(":");
      if (colonIdx !== -1 && !trimmedTarget.startsWith("http")) {
        displayText = trimmedTarget.slice(colonIdx + 1).trim();
      } else {
        displayText = trimmedTarget;
      }
    }

    const label: LinkLabel = { text: displayText };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: linkType,
            link,
            extra: null,
            label,
            target: null,
          },
        },
      ],
      consumed,
    };
  },
};

// Known interwiki prefixes
const INTERWIKI_PREFIXES = new Set(["wikipedia", "google", "dictionary", "wikidot"]);

function determineLinkTypeAndLocation(target: string): { linkType: LinkType; link: LinkLocation } {
  if (target.startsWith("#")) {
    return { linkType: "anchor", link: target };
  }
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return { linkType: "direct", link: target };
  }
  // Check for interwiki links (only known prefixes)
  const colonIdx = target.indexOf(":");
  if (colonIdx > 0 && !target.includes("/")) {
    const prefix = target.slice(0, colonIdx).toLowerCase();
    if (INTERWIKI_PREFIXES.has(prefix)) {
      return { linkType: "interwiki", link: target };
    }
  }
  // Page link (includes category pages like "system:Recent Changes")
  return { linkType: "page", link: { site: null, page: target } };
}
