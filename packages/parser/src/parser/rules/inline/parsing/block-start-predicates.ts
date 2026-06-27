import type { ParseContext } from "../../types";
import { BLOCK_START_TOKEN_SET } from "../../../constants";
import {
  isExcludedBlockToken,
  isIndentAcceptingBlock,
  isUnknownBlockToken,
} from "./block-boundary";

export function isParagraphBreakingBlockStart(
  ctx: ParseContext,
  newlinePos: number,
  lookAhead: number,
): boolean {
  const nextPos = newlinePos + lookAhead;
  const nextMeaningfulToken = ctx.tokens[nextPos];
  if (!nextMeaningfulToken || !BLOCK_START_TOKEN_SET.has(nextMeaningfulToken.type)) {
    return false;
  }

  const isIndentedBlockOpener =
    (nextMeaningfulToken.type === "BLOCK_OPEN" || nextMeaningfulToken.type === "BLOCK_END_OPEN") &&
    isIndentAcceptingBlock(ctx, nextPos);

  if (!nextMeaningfulToken.lineStart && !isIndentedBlockOpener) {
    return false;
  }

  return (
    !isOrphanCloseSpan(ctx, nextPos) &&
    !isAnchorName(ctx, nextPos) &&
    !isInvalidBlockOpen(ctx, nextPos) &&
    !isInvalidHeading(ctx, nextPos) &&
    !isExcludedBlockStart(ctx, nextPos) &&
    !isUnknownBlockStart(ctx, nextPos)
  );
}

function isOrphanCloseSpan(ctx: ParseContext, blockEndOpenPos: number): boolean {
  const token = ctx.tokens[blockEndOpenPos];
  if (token?.type !== "BLOCK_END_OPEN") return false;

  const namePos = skipWhitespace(ctx, blockEndOpenPos + 1);
  const nameToken = ctx.tokens[namePos];
  return nameToken?.type === "IDENTIFIER" && nameToken.value.toLowerCase() === "span";
}

function isAnchorName(ctx: ParseContext, blockOpenPos: number): boolean {
  const token = ctx.tokens[blockOpenPos];
  if (token?.type !== "BLOCK_OPEN") return false;

  const hashPos = skipWhitespace(ctx, blockOpenPos + 1);
  const hashToken = ctx.tokens[hashPos];
  return hashToken?.type === "HASH" || (hashToken?.type === "TEXT" && hashToken.value === "#");
}

function isInvalidBlockOpen(ctx: ParseContext, blockOpenPos: number): boolean {
  const token = ctx.tokens[blockOpenPos];
  if (token?.type !== "BLOCK_OPEN") return false;

  const firstAfter = ctx.tokens[blockOpenPos + 1];
  if (firstAfter?.type === "TEXT" && (firstAfter.value === ">" || firstAfter.value === "<")) {
    const secondAfter = ctx.tokens[blockOpenPos + 2];
    if (secondAfter && secondAfter.type !== "BLOCK_CLOSE") {
      return true;
    }
  }

  const blockNamePos = skipWhitespace(ctx, blockOpenPos + 1);
  const blockNameToken = ctx.tokens[blockNamePos];
  return (
    blockNameToken !== undefined &&
    (blockNameToken.type === "TEXT" || blockNameToken.type === "IDENTIFIER") &&
    blockNameToken.value.toLowerCase() === "footnoteblock" &&
    Boolean(ctx.scope.footnoteBlockParsed)
  );
}

function isInvalidHeading(ctx: ParseContext, markerPos: number): boolean {
  const marker = ctx.tokens[markerPos];
  if (marker?.type !== "HEADING_MARKER") return false;

  const markerLen = marker.value.length;
  const afterMarker = ctx.tokens[markerPos + 1];
  if (markerLen > 6) {
    return true;
  }

  if (afterMarker?.type === "STAR") {
    return ctx.tokens[markerPos + 2]?.type !== "WHITESPACE";
  }

  return afterMarker?.type !== "WHITESPACE";
}

function isExcludedBlockStart(ctx: ParseContext, tokenPos: number): boolean {
  const token = ctx.tokens[tokenPos];
  return (
    (token?.type === "BLOCK_OPEN" || token?.type === "BLOCK_END_OPEN") &&
    isExcludedBlockToken(ctx, tokenPos)
  );
}

function isUnknownBlockStart(ctx: ParseContext, tokenPos: number): boolean {
  const token = ctx.tokens[tokenPos];
  return (
    (token?.type === "BLOCK_OPEN" || token?.type === "BLOCK_END_OPEN") &&
    isUnknownBlockToken(ctx, tokenPos)
  );
}

function skipWhitespace(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
  }
  return pos;
}
