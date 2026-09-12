import { tokenize, type Token } from "../../../lexer";
import { findCodeOpen } from "../../rules/block/code/open";
import { findCodeBodyBounds } from "../../rules/block/code/boundary";

const BASE_PLACEHOLDER_OPEN = "\uE000";
const BASE_PLACEHOLDER_CLOSE = "\uE001";

const RAW_BLOCK_OPEN_PATTERN = /\[\[html\b[^\]]*\]\]/iy;

/** Unique sentinel characters used to wrap raw-region placeholders. */
export interface Sentinels {
  open: string;
  close: string;
}

/**
 * Choose sentinel strings that are guaranteed not to appear in `source`.
 * The placeholders we splice into the masked source have the form
 * `<open><digits><close>`, so the restore pass must not confuse them
 * with content.
 */
export function makeUniqueSentinels(source: string): Sentinels {
  let openRun = 0;
  let closeRun = 0;
  let longestOpenRun = 0;
  let longestCloseRun = 0;

  for (const char of source) {
    openRun = char === BASE_PLACEHOLDER_OPEN ? openRun + 1 : 0;
    closeRun = char === BASE_PLACEHOLDER_CLOSE ? closeRun + 1 : 0;
    longestOpenRun = Math.max(longestOpenRun, openRun);
    longestCloseRun = Math.max(longestCloseRun, closeRun);
  }

  return {
    open: BASE_PLACEHOLDER_OPEN.repeat(longestOpenRun + 1),
    close: BASE_PLACEHOLDER_CLOSE.repeat(longestCloseRun + 1),
  };
}

/**
 * Walk `source` and replace each raw region with a placeholder token so
 * downstream passes do not transform their bodies.
 */
export function maskRawRegions(
  source: string,
  sentinels: Sentinels,
): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let tokens: Token[] | undefined;
  const getTokens = () => (tokens ??= tokenize(source));
  let masked = "";
  let i = 0;

  while (i < source.length) {
    if (source.startsWith("[!--", i)) {
      const close = source.indexOf("--]", i + 4);
      if (close !== -1) {
        const end = close + 3;
        masked += source.slice(i, end);
        i = end;
        continue;
      }
    }

    const rawBlock = tryMaskRawBlock(source, i, placeholders, sentinels, getTokens);
    if (rawBlock) {
      masked += rawBlock.placeholder;
      i = rawBlock.end;
      continue;
    }

    const rawInline = tryMaskRawInline(source, i, placeholders, sentinels);
    if (rawInline) {
      masked += rawInline.placeholder;
      i = rawInline.end;
      continue;
    }

    masked += source[i];
    i++;
  }

  return { masked, placeholders };
}

/** Inverse of {@link maskRawRegions}: replace placeholders with originals. */
export function restorePlaceholders(
  source: string,
  placeholders: string[],
  sentinels: Sentinels,
): string {
  const pattern = new RegExp(
    `${escapeRegex(sentinels.open)}(\\d+)${escapeRegex(sentinels.close)}`,
    "g",
  );
  return source.replace(pattern, (_, idx: string) => placeholders[Number(idx)] ?? "");
}

function tryMaskRawBlock(
  source: string,
  pos: number,
  placeholders: string[],
  sentinels: Sentinels,
  getTokens: () => Token[],
): { placeholder: string; end: number } | null {
  if (source[pos] !== "[" || source[pos + 1] !== "[") return null;

  if (source.slice(pos, pos + 6).toLowerCase() === "[[code") {
    const tokens = getTokens();
    const start = tokenAtOffset(tokens, pos);
    const open = findCodeOpen(tokens, start);
    if (!open) return null;
    const bounds = open.closingSwallowed ? null : findCodeBodyBounds(tokens, open.bodyStart);
    const end = open.closingSwallowed
      ? tokens[open.attributesEnd - 1]!.position.end.offset
      : bounds!.foundClose
        ? tokens[bounds!.end - 1]!.position.end.offset
        : source.length;
    return { placeholder: pushPlaceholder(placeholders, source.slice(pos, end), sentinels), end };
  }

  RAW_BLOCK_OPEN_PATTERN.lastIndex = pos;
  const openMatch = RAW_BLOCK_OPEN_PATTERN.exec(source);
  if (!openMatch) return null;

  const openLen = openMatch[0].length;
  const closePattern = /\[\[\/\s*html\s*\]\]/gi;
  closePattern.lastIndex = pos + openLen;
  const closeMatch = closePattern.exec(source);

  if (closeMatch) {
    const end = closeMatch.index + closeMatch[0].length;
    return {
      placeholder: pushPlaceholder(placeholders, source.slice(pos, end), sentinels),
      end,
    };
  }

  return null;
}

function tokenAtOffset(tokens: readonly Token[], offset: number): number {
  let low = 0;
  let high = tokens.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (tokens[middle]!.position.start.offset < offset) low = middle + 1;
    else high = middle;
  }
  return tokens[low]?.position.start.offset === offset ? low : tokens.length;
}

function tryMaskRawInline(
  source: string,
  pos: number,
  placeholders: string[],
  sentinels: Sentinels,
): { placeholder: string; end: number } | null {
  if (source[pos] === "@" && source[pos + 1] === "<") {
    return tryMaskSingleLineRaw(source, pos, 2, ">@", placeholders, sentinels);
  }

  if (source[pos] === "@" && source[pos + 1] === "@") {
    return tryMaskSingleLineRaw(source, pos, 2, "@@", placeholders, sentinels);
  }

  return null;
}

function tryMaskSingleLineRaw(
  source: string,
  pos: number,
  openerLength: number,
  close: string,
  placeholders: string[],
  sentinels: Sentinels,
): { placeholder: string; end: number } | null {
  const end = singleLineRawEnd(source, pos, openerLength, close);
  if (end === pos) return null;
  return {
    placeholder: pushPlaceholder(placeholders, source.slice(pos, end), sentinels),
    end,
  };
}

function singleLineRawEnd(
  source: string,
  pos: number,
  openerLength: number,
  close: string,
): number {
  const closePos = source.indexOf(close, pos + openerLength);
  const newline = source.indexOf("\n", pos + openerLength);
  if (closePos === -1 || (newline !== -1 && newline < closePos)) return pos;
  return closePos + close.length;
}

function pushPlaceholder(placeholders: string[], text: string, sentinels: Sentinels): string {
  const idx = placeholders.length;
  placeholders.push(text);
  return `${sentinels.open}${idx}${sentinels.close}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
