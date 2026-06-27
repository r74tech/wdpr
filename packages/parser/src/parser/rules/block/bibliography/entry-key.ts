import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export interface BibliographyKeyResult {
  label: string;
  key: Element[];
  consumed: number;
}

export function parseBibliographyKey(
  ctx: ParseContext,
  startPos: number,
): BibliographyKeyResult | null {
  let pos = startPos;
  let consumed = 0;

  const colonToken = ctx.tokens[pos];
  if (!colonToken || colonToken.type !== "COLON" || !colonToken.lineStart) {
    return null;
  }
  pos++;
  consumed++;

  const whitespaceAfterColon = ctx.tokens[pos];
  if (!whitespaceAfterColon || whitespaceAfterColon.type !== "WHITESPACE") {
    return null;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let label = "";
  let foundSecondColon = false;
  const key: Element[] = [];

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    if (token.type === "COLON") {
      foundSecondColon = true;
      pos++;
      consumed++;
      break;
    }

    label += token.value;
    key.push({ element: "text", data: token.value });
    pos++;
    consumed++;
  }

  if (!foundSecondColon) {
    return null;
  }

  trimTrailingWhitespaceText(key);

  return {
    label: label.trim(),
    key,
    consumed,
  };
}

function trimTrailingWhitespaceText(nodes: Element[]): void {
  while (nodes.length > 0) {
    const lastNode = nodes[nodes.length - 1];
    if (
      lastNode &&
      lastNode.element === "text" &&
      typeof lastNode.data === "string" &&
      lastNode.data.trim() === ""
    ) {
      nodes.pop();
    } else {
      break;
    }
  }
}
