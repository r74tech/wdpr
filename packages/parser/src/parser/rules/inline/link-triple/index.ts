/**
 *
 * Parses the Wikidot triple-bracket link syntax: `[[[target | label]]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { literalOpenLink } from "./fallback";
import { buildTripleLinkLabel } from "./label";
import { collectTripleLinkParts, hasClosingLinkMarker } from "./syntax";
import {
  determineLinkTypeAndLocation,
  isInvalidTripleLinkTarget,
  normalizeTripleLinkTarget,
} from "./target";

export const linkTripleRule: InlineRule = {
  name: "linkTriple",
  startTokens: ["LINK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    if (!hasClosingLinkMarker(ctx, ctx.pos + 1)) {
      return literalOpenLink(startToken.value);
    }

    const parts = collectTripleLinkParts(ctx, ctx.pos + 1);
    const trimmedTarget = parts.target.trim();
    if (isInvalidTripleLinkTarget(trimmedTarget, parts.foundPipe)) {
      return literalOpenLink(startToken.value);
    }

    const normalized = normalizeTripleLinkTarget(trimmedTarget);
    const { linkType, link } = determineLinkTypeAndLocation(normalized.target);
    const label = buildTripleLinkLabel({
      foundPipe: parts.foundPipe,
      labelText: parts.labelText,
      finalTarget: normalized.target,
      originalTarget: trimmedTarget,
    });

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
            target: normalized.hasStar && linkType === "direct" ? "new-tab" : null,
          },
        },
      ],
      consumed: parts.consumed,
    };
  },
};
