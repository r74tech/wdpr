import type { ParseContext } from "../../types";

/** The four text-alignment directions Wikidot supports. */
export type AlignDirection = "left" | "right" | "center" | "justify";

/**
 * Attempts to parse the interior of an align opening tag starting after
 * the BLOCK_OPEN (`[[`) token.
 */
export function parseAlignOpen(
  ctx: ParseContext,
  pos: number,
): { direction: AlignDirection; consumed: number } | null {
  const tokens = ctx.tokens;
  const firstToken = tokens[pos];
  if (!firstToken) return null;

  if (
    firstToken.type === "BLOCKQUOTE_MARKER" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  if (
    firstToken.type === "TEXT" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  if (
    firstToken.type === "TEXT" &&
    firstToken.value === "<" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "left", consumed: 2 };
  }

  if (firstToken.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
    return { direction: "center", consumed: 2 };
  }

  if (
    firstToken.type === "EQUALS" &&
    tokens[pos + 1]?.type === "EQUALS" &&
    tokens[pos + 2]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "justify", consumed: 3 };
  }

  return null;
}

/**
 * Tests whether the tokens at the current position form a closing align tag.
 */
export function parseAlignClose(
  ctx: ParseContext,
  direction: AlignDirection,
): { match: boolean; consumed: number } {
  const tokens = ctx.tokens;
  let pos = ctx.pos;

  if (tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return { match: false, consumed: 0 };
  }
  pos++;

  if (direction === "right") {
    if (
      (tokens[pos]?.type === "BLOCKQUOTE_MARKER" || tokens[pos]?.type === "TEXT") &&
      tokens[pos]?.value === ">" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  if (direction === "left") {
    if (
      tokens[pos]?.type === "TEXT" &&
      tokens[pos]?.value === "<" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  if (direction === "center") {
    if (tokens[pos]?.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
      return { match: true, consumed: 3 };
    }
  }

  if (direction === "justify") {
    if (
      tokens[pos]?.type === "EQUALS" &&
      tokens[pos + 1]?.type === "EQUALS" &&
      tokens[pos + 2]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 4 };
    }
  }

  return { match: false, consumed: 0 };
}

export function alignDirectionSymbol(direction: AlignDirection): string {
  return { left: "<", right: ">", center: "=", justify: "==" }[direction];
}
