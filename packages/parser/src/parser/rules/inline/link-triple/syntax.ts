import type { ParseContext } from "../../types";

export interface TripleLinkParts {
  target: string;
  labelText: string;
  foundPipe: boolean;
  consumed: number;
}

export function hasClosingLinkMarker(ctx: ParseContext, startPos: number): boolean {
  let pos = startPos;
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      return false;
    }
    if (token.type === "LINK_CLOSE") {
      return true;
    }
    if (token.type === "NEWLINE") {
      const next = ctx.tokens[pos + 1];
      if (next?.type === "NEWLINE" || next?.type === "LINK_CLOSE") {
        return false;
      }
    }
    pos++;
  }
  return false;
}

export function collectTripleLinkParts(ctx: ParseContext, startPos: number): TripleLinkParts {
  let target = "";
  let labelText = "";
  let foundPipe = false;
  let consumed = 1;
  let pos = startPos;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "LINK_CLOSE" || token.type === "EOF") {
      break;
    }

    if (token.type === "NEWLINE") {
      if (foundPipe) {
        labelText += " ";
      } else {
        target += " ";
      }
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

  if (ctx.tokens[pos]?.type === "LINK_CLOSE") {
    consumed++;
  }

  return { target, labelText, foundPipe, consumed };
}
