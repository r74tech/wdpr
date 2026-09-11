import type { AnchorTarget } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { normalizeAnchor } from "./anchor";
import { isDirectBracketUrl } from "./direct-url";
import { collectBracketLinkParts } from "./parts";
import { parseBracketLinkPrefix } from "./prefix";
import { isBracketEmail, wikipediaPage } from "./special-target";

export interface ParsedBracketLink {
  interwiki?: boolean;
  link: string;
  labelText: string;
  target: AnchorTarget | null;
  consumed: number;
}

export function parseSingleBracketLink(ctx: ParseContext): ParsedBracketLink | null {
  const prefix = parseBracketLinkPrefix(ctx, ctx.pos + 1);
  const parts = collectBracketLinkParts(ctx, prefix.bodyStart);
  if (!parts) {
    return null;
  }

  const link = parts.first.trim();
  const email = isBracketEmail(link);
  const wikiPage = wikipediaPage(link);
  if (!email && wikiPage === null && !isDirectBracketUrl(link)) {
    return null;
  }

  const labelText = parts.label.trim() || wikiPage;
  if (!labelText) {
    return null;
  }

  return {
    link: email ? `mailto:${link}` : link,
    interwiki: wikiPage !== null,
    labelText,
    target: wikiPage !== null ? "new-tab" : prefix.target,
    consumed: 1 + prefix.consumed + parts.consumed,
  };
}

export function parseStarBracketLink(ctx: ParseContext): ParsedBracketLink | null {
  const parts = collectBracketLinkParts(ctx, ctx.pos + 1);
  if (!parts) {
    return null;
  }

  const link = parts.first.trim();
  if (!link) {
    return null;
  }

  const labelText = parts.label.trim() || link;

  return {
    link,
    labelText,
    target: "new-tab",
    consumed: 1 + parts.consumed,
  };
}

export function parseAnchorBracketLink(
  ctx: ParseContext,
): Omit<ParsedBracketLink, "target"> | null {
  const parts = collectBracketLinkParts(ctx, ctx.pos + 1);
  if (!parts) {
    return null;
  }

  const labelText = parts.label.trim();
  if (!labelText) {
    return null;
  }

  const anchor = parts.first.trim();

  return {
    link: anchor ? `#${normalizeAnchor(anchor)}` : "javascript:;",
    labelText,
    consumed: 1 + parts.consumed,
  };
}
