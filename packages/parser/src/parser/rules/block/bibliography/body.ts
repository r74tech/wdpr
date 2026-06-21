import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { parseBibliographyEntry, type BibliographyEntry } from "./entries";

export interface BibliographyBodyResult {
  entries: BibliographyEntry[];
  consumed: number;
  foundClose: boolean;
}

export function collectBibliographyBody(
  ctx: ParseContext,
  startPos: number,
): BibliographyBodyResult {
  const entries: BibliographyEntry[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const closeConsumed = consumeBibliographyClose(ctx, pos);
    if (closeConsumed !== null) {
      return {
        entries,
        consumed: consumed + closeConsumed,
        foundClose: true,
      };
    }

    if (token.type === "WHITESPACE" || token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "COLON" && token.lineStart) {
      const result = parseBibliographyEntry(ctx, pos);
      if (result) {
        entries.push(result.entry);
        pos += result.consumed;
        consumed += result.consumed;
        continue;
      }
    }

    pos++;
    consumed++;
  }

  return { entries, consumed, foundClose: false };
}

function consumeBibliographyClose(ctx: ParseContext, startPos: number): number | null {
  const openToken = ctx.tokens[startPos];
  if (openToken?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, startPos + 1);
  if (closeNameResult?.name !== "bibliography") {
    return null;
  }

  let pos = startPos + 1 + closeNameResult.consumed;
  let consumed = 1 + closeNameResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    consumed++;
  }

  return consumed;
}
