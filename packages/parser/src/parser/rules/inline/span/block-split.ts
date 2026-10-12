/**
 * Split `[[span]]` pairs at the `[[div]]` boundaries they cross.
 *
 * Wikidot pairs `[[span]]` with `[[/span]]` before it parses `[[div]]`, so a
 * span may open inside a div and close after it. HTML Tidy then repairs the
 * output by closing the span at each block boundary and reopening it with the
 * same attributes on the other side. Rewriting the token stream the same way
 * keeps every span local to one block, so the regular span and div rules
 * produce the repaired structure.
 *
 * @module
 */

import type { Token } from "../../../../lexer";
import type { ParseContext } from "../../types";
import { codeBlockRule } from "../../block/code";
import { isDivClose } from "../../block/div/close";
import { isHtmlCloseAt } from "../../block/html/body";
import { parseHtmlOpen } from "../../block/html/open";
import { parseDivOpen } from "../../block/div/open";
import { mathBlockRule } from "../../block/math";
import { createOpaqueProbe, opaqueRuleEnd } from "../../opaque-probe";
import { matchFootnoteCloses } from "../footnote/boundary";
import { linkTripleRule } from "../link-triple";
import { protectedInlineRegionEnd } from "../raw/end";
import { parseCloseSpan, parseSpanOpener } from "./syntax";

// These constructs are replaced before Span in Wikidot's processing order.
const opaqueRules = [codeBlockRule, mathBlockRule, linkTripleRule];

type BoundaryKind = "open" | "close";

interface Segment {
  start: number;
  end: number;
  /** Boundary the segment starts after; undefined for the first segment. */
  after?: BoundaryKind;
}

interface OpenSpan {
  /** `[[span_]]` shares the close tag but hides its body from Div in Wikidot. */
  strip: boolean;
  openStart: number;
  openEnd: number;
  segmentStart: number;
  after?: BoundaryKind;
  segments: Segment[];
}

interface CrossingSpan extends OpenSpan {
  closeStart: number;
  closeEnd: number;
}

interface Edits {
  closers: Map<number, CrossingSpan[]>;
  openers: Map<number, CrossingSpan[]>;
  deleted: Set<number>;
}

/**
 * Return a token stream in which no `[[span]]` pair crosses a div boundary.
 * The original array is returned when nothing needs splitting.
 */
export function splitSpansAtDivBoundaries(ctx: ParseContext): Token[] {
  if (!hasSpanOpener(ctx.tokens)) return ctx.tokens;
  const crossing = findCrossingSpans(createOpaqueProbe(ctx));
  if (crossing.length === 0) return ctx.tokens;
  return applyEdits(ctx.tokens, planEdits(ctx.tokens, crossing));
}

function hasSpanOpener(tokens: readonly Token[]): boolean {
  for (let pos = 0; pos < tokens.length - 1; pos++) {
    if (tokens[pos]!.type === "BLOCK_OPEN" && tokens[pos + 1]!.value.toLowerCase() === "span") {
      return true;
    }
  }
  return false;
}

function findCrossingSpans(probe: ParseContext): CrossingSpan[] {
  const tokens = probe.tokens;
  const stack: OpenSpan[] = [];
  const crossing: CrossingSpan[] = [];
  let divDepth = 0;
  let stripDepth = 0;
  let footnoteCloses: Map<number, number> | undefined;
  let htmlCloses: Int32Array | undefined;

  const crossBoundary = (start: number, end: number, kind: BoundaryKind): void => {
    for (const span of stack) {
      span.segments.push({ start: span.segmentStart, end: start, after: span.after });
      span.segmentStart = end;
      span.after = kind;
    }
  };

  for (let pos = 0; pos < tokens.length; pos++) {
    const token = tokens[pos]!;

    const protectedEnd = protectedInlineRegionEnd(tokens, pos, tokens.length);
    if (protectedEnd > pos) {
      pos = protectedEnd - 1;
      continue;
    }
    const opaqueEnd = opaqueRuleEnd(probe, pos, opaqueRules, true);
    if (opaqueEnd > pos) {
      pos = opaqueEnd - 1;
      continue;
    }

    if (token.type === "BLOCK_OPEN") {
      probe.pos = pos;
      // Footnote precedes Span and keeps its body out of the outer source.
      if (tokens[pos + 1]?.value.toLowerCase() === "footnote") {
        footnoteCloses ??= matchFootnoteCloses(probe);
        const end = footnoteCloses.get(pos);
        if (end !== undefined) {
          pos = end - 1;
          continue;
        }
      }
      // An HTML block keeps its body verbatim, but only where a block can start.
      if (startsLine(tokens, pos) && parseHtmlOpen(probe, pos)) {
        htmlCloses ??= findNextHtmlCloses(probe);
        const end = htmlCloses[pos]!;
        if (end >= 0) {
          pos = end - 1;
          continue;
        }
      }
      const opener = parseSpanOpener(probe);
      if (opener.success) {
        const strip = opener.blockName === "span_";
        if (strip) stripDepth++;
        stack.push({
          strip,
          openStart: pos,
          openEnd: opener.pos,
          segmentStart: opener.pos,
          segments: [],
        });
        pos = opener.pos - 1;
        continue;
      }
      if (stripDepth > 0) continue;
      const div = parseDivOpen(probe);
      if (div?.hasRequiredNewline && startsLine(tokens, pos)) {
        divDepth++;
        crossBoundary(pos, div.bodyStart, "open");
        pos = div.bodyStart - 1;
      }
      continue;
    }

    if (token.type !== "BLOCK_END_OPEN") continue;
    const close = parseCloseSpan(probe, pos);
    if (close.success) {
      const span = stack.pop();
      if (span?.strip) stripDepth--;
      if (span && !span.strip && span.segments.length > 0) {
        span.segments.push({ start: span.segmentStart, end: pos, after: span.after });
        crossing.push({ ...span, closeStart: pos, closeEnd: pos + close.consumed });
      }
      pos += close.consumed - 1;
      continue;
    }
    probe.pos = pos;
    if (stripDepth === 0 && divDepth > 0 && isDivClose(probe)) {
      divDepth--;
      const end = tokens[pos + 2]?.type === "BLOCK_CLOSE" ? pos + 3 : pos + 2;
      crossBoundary(pos, end, "close");
      pos = end - 1;
    }
  }

  return crossing;
}

/** End of the first `[[/html]]` at or after each position, or -1 when none follows. */
function findNextHtmlCloses(probe: ParseContext): Int32Array {
  const tokens = probe.tokens;
  const ends = new Int32Array(tokens.length + 1).fill(-1);
  for (let pos = tokens.length - 1; pos >= 0; pos--) {
    if (!isHtmlCloseAt(probe, pos)) {
      ends[pos] = ends[pos + 1]!;
      continue;
    }
    let end = pos + 1;
    while (tokens[end] && tokens[end]!.type !== "BLOCK_CLOSE") end++;
    ends[pos] = end + 1;
  }
  return ends;
}

/** Div opens where block parsing can start: after indentation at most. */
function startsLine(tokens: readonly Token[], pos: number): boolean {
  let prev = pos - 1;
  while (prev >= 0 && tokens[prev]!.type === "WHITESPACE") prev--;
  return prev < 0 || tokens[prev]!.type === "NEWLINE";
}

function planEdits(tokens: readonly Token[], crossing: CrossingSpan[]): Edits {
  const edits: Edits = { closers: new Map(), openers: new Map(), deleted: new Set() };
  const add = (map: Map<number, CrossingSpan[]>, pos: number, span: CrossingSpan): void => {
    const list = map.get(pos);
    if (list) list.push(span);
    else map.set(pos, [span]);
  };

  for (const span of crossing) {
    const last = span.segments.length - 1;
    span.segments.forEach((segment, index) => {
      // Tidy keeps a trailing line break inside the reopened span, but drops
      // spans that only wrap whitespace between blocks.
      const hasContent = segmentHasContent(tokens, segment, index === last && index > 0);
      if (index === 0) {
        if (hasContent) add(edits.closers, closePoint(tokens, segment), span);
        else deleteRange(edits, span.openStart, span.openEnd);
        return;
      }
      if (!hasContent) {
        if (index === last) deleteRange(edits, span.closeStart, span.closeEnd);
        return;
      }
      add(edits.openers, openPoint(tokens, segment), span);
      if (index !== last) add(edits.closers, closePoint(tokens, segment), span);
    });
  }

  return edits;
}

function segmentHasContent(
  tokens: readonly Token[],
  segment: Segment,
  newlineIsContent: boolean,
): boolean {
  for (let pos = segment.start; pos < segment.end; pos++) {
    const type = tokens[pos]!.type;
    if (type === "WHITESPACE") continue;
    if (type === "NEWLINE" && !newlineIsContent) continue;
    return true;
  }
  return false;
}

/** Close before the whitespace that separates the content from the boundary. */
function closePoint(tokens: readonly Token[], segment: Segment): number {
  let pos = segment.end;
  while (pos > segment.start && isBlank(tokens[pos - 1]!)) pos--;
  return pos;
}

/**
 * Reopen right after `[[/div]]` so the following newline stays inside the
 * span, as Wikidot does, and at the first content inside a div body.
 */
function openPoint(tokens: readonly Token[], segment: Segment): number {
  let pos = segment.start;
  while (
    pos < segment.end &&
    (tokens[pos]!.type === "WHITESPACE" ||
      (segment.after === "open" && tokens[pos]!.type === "NEWLINE"))
  ) {
    pos++;
  }
  return pos;
}

function isBlank(token: Token): boolean {
  return token.type === "WHITESPACE" || token.type === "NEWLINE";
}

function deleteRange(edits: Edits, start: number, end: number): void {
  for (let pos = start; pos < end; pos++) edits.deleted.add(pos);
}

function applyEdits(tokens: readonly Token[], edits: Edits): Token[] {
  const result: Token[] = [];
  for (let pos = 0; pos < tokens.length; pos++) {
    const token = tokens[pos]!;
    const inserted: Token[] = [];
    // Close inner spans first and reopen outer spans first.
    const closers = edits.closers.get(pos)?.sort((a, b) => b.openStart - a.openStart) ?? [];
    for (const span of closers) inserted.push(...closeTokens(tokens, span));
    const openers = edits.openers.get(pos)?.sort((a, b) => a.openStart - b.openStart) ?? [];
    for (const span of openers) inserted.push(...tokens.slice(span.openStart, span.openEnd));

    if (inserted.length > 0) {
      inserted.forEach((synthetic, index) => {
        result.push({
          ...synthetic,
          position: { start: token.position.start, end: token.position.start },
          lineStart: index === 0 && token.lineStart,
        });
      });
      if (!edits.deleted.has(pos)) result.push({ ...token, lineStart: false });
      continue;
    }
    if (!edits.deleted.has(pos)) result.push(token);
  }
  return result;
}

function closeTokens(tokens: readonly Token[], span: CrossingSpan): Token[] {
  const close = tokens.slice(span.closeStart, span.closeEnd);
  if (close[close.length - 1]?.type === "BLOCK_CLOSE") return close;
  return [...close, { ...close[0]!, type: "BLOCK_CLOSE", value: "]]" }];
}
