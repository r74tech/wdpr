const BASE_PLACEHOLDER_OPEN = "\uE000";
const BASE_PLACEHOLDER_CLOSE = "\uE001";

const RAW_BLOCK_OPEN_PATTERN = /\[\[\s*(code|html)\b[^\]]*\]\]/iy;

/** Unique sentinel characters used to wrap raw-region placeholders. */
export interface Sentinels {
  open: string;
  close: string;
}

/**
 * Choose sentinel strings that are guaranteed not to appear in `source`.
 * The placeholders we splice into the masked source have the form
 * `<open><digits><close>`, so the restore pass must not confuse them
 * with content. Extends both sentinel characters until neither appears.
 */
export function makeUniqueSentinels(source: string): Sentinels {
  let open = BASE_PLACEHOLDER_OPEN;
  let close = BASE_PLACEHOLDER_CLOSE;
  while (source.includes(open) || source.includes(close)) {
    open += BASE_PLACEHOLDER_OPEN;
    close += BASE_PLACEHOLDER_CLOSE;
  }
  return { open, close };
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
  let masked = "";
  let i = 0;

  while (i < source.length) {
    const rawBlock = tryMaskRawBlock(source, i, placeholders, sentinels);
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
): { placeholder: string; end: number } | null {
  if (source[pos] !== "[" || source[pos + 1] !== "[") return null;

  RAW_BLOCK_OPEN_PATTERN.lastIndex = pos;
  const openMatch = RAW_BLOCK_OPEN_PATTERN.exec(source);
  if (!openMatch) return null;

  const name = openMatch[1]!.toLowerCase();
  const openLen = openMatch[0].length;
  const closePattern = new RegExp(`\\[\\[\\/\\s*${name}\\s*\\]\\]`, "ig");
  closePattern.lastIndex = pos + openLen;
  const closeMatch = closePattern.exec(source);

  if (closeMatch) {
    const end = closeMatch.index + closeMatch[0].length;
    return {
      placeholder: pushPlaceholder(placeholders, source.slice(pos, end), sentinels),
      end,
    };
  }

  if (name !== "code") return null;

  return {
    placeholder: pushPlaceholder(placeholders, source.slice(pos), sentinels),
    end: source.length,
  };
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
  const closePos = source.indexOf(close, pos + openerLength);
  const newline = source.indexOf("\n", pos + openerLength);
  if (closePos === -1 || (newline !== -1 && newline < closePos)) return null;

  const end = closePos + close.length;
  return {
    placeholder: pushPlaceholder(placeholders, source.slice(pos, end), sentinels),
    end,
  };
}

function pushPlaceholder(placeholders: string[], text: string, sentinels: Sentinels): string {
  const idx = placeholders.length;
  placeholders.push(text);
  return `${sentinels.open}${idx}${sentinels.close}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
