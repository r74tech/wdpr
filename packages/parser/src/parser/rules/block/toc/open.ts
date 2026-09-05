import type { Alignment } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAttributes } from "../utils";

export interface TocOpenResult {
  align: Alignment | null;
  title: string | undefined;
  consumed: number;
}

export function parseTocOpen(ctx: ParseContext, startPos: number): TocOpenResult | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = startPos + 1;
  let align: Alignment | null = null;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
  }

  const firstToken = ctx.tokens[pos];
  if (!isNameToken(firstToken)) {
    return null;
  }

  const firstValue = firstToken.value.toLowerCase();
  if (firstValue === "toc") {
    pos++;
  } else if (firstValue === "f") {
    pos++;
    const dirToken = ctx.tokens[pos];
    if (dirToken?.type === "TEXT" && dirToken.value === "<") {
      align = "left";
      pos++;
    } else if (dirToken?.type === "TEXT" && dirToken.value === ">") {
      align = "right";
      pos++;
    } else {
      return null;
    }

    const tocToken = ctx.tokens[pos];
    if (!isNameToken(tocToken) || tocToken.value.toLowerCase() !== "toc") {
      return null;
    }
    pos++;
  } else {
    return null;
  }

  const attributes = parseAttributes(ctx, pos);
  pos += attributes.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return {
    align,
    title: attributes.attrs.title,
    consumed: pos + 1 - startPos,
  };
}

function isNameToken(
  token: ParseContext["tokens"][number] | undefined,
): token is ParseContext["tokens"][number] & { type: "TEXT" | "IDENTIFIER" } {
  return token?.type === "TEXT" || token?.type === "IDENTIFIER";
}
