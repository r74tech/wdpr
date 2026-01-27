import type { Element, LinkType, LinkLocation, LinkLabel } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";

export const linkTripleRule: InlineRule = {
  name: "linkTriple",
  startTokens: ["LINK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "LINK_CLOSE")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Collect tokens until LINK_CLOSE
    let target = "";
    let labelText = "";
    let foundPipe = false;
    let consumed = 1; // opening [[[
    let pos = ctx.pos + 1;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "LINK_CLOSE" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
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
    const { linkType, link } = determineLinkTypeAndLocation(trimmedTarget);
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
