import type { Element, LinkType, LinkLocation, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Check if there's a LINK_CLOSE (]]]) ahead, allowing newlines
 * Wikidot allows multi-line links like [[[page |\nLabel]]]
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
    // Allow at most one newline (don't span paragraphs)
    if (token.type === "NEWLINE") {
      const next = ctx.tokens[pos + 1];
      if (next?.type === "NEWLINE") {
        return false; // Double newline = paragraph break
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
    const displayText = foundPipe ? labelText.trim() : trimmedTarget;

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

function determineLinkTypeAndLocation(target: string): { linkType: LinkType; link: LinkLocation } {
  if (target.startsWith("#")) {
    return { linkType: "anchor", link: target };
  }
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return { linkType: "direct", link: target };
  }
  if (target.includes(":") && !target.includes("/")) {
    // Interwiki link like "wikipedia:Article"
    return { linkType: "interwiki", link: target };
  }
  // Page link
  return { linkType: "page", link: { site: null, page: target } };
}
