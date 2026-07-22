/**
 *
 * Block rule for the Wikidot `[[gallery]]` image gallery.
 *
 * ```
 * [[gallery size="thumbnail" order="name" viewer="no"]]
 * : first-image.jpg
 * : *page/other-image.jpg link="some-page" alt="Alt text"
 * [[/gallery]]
 * ```
 *
 * The content form requires the `]]` to be followed immediately by one or
 * more `: source` lines and a `[[/gallery]]` close tag (Wikidot regex
 * `\[\[gallery(\s[^\]]*?)?\]\](?:((?:\n: [^\n]+)+)\n\[\[\/gallery\]\])?`).
 * Anything else falls back to the standalone content-less form, which shows
 * the current page's image attachments after data resolution
 * (`content: { type: "auto", files: null }`); the following text then
 * parses normally.
 *
 * Honored opening-tag attributes are `size` (small / medium / thumbnail /
 * square / original, fallback thumbnail), `viewer` (`"no"`/`"false"`
 * disable the lightbox) and `order` (auto-collection sort order, with
 * Wikidot's deprecated aliases normalized).
 *
 * Deliberate differences from the Wikidot parser: the opening tag must
 * fit on one line and attribute names are lowercased with unquoted values
 * accepted (both shared with wdpr's other block rules), and `flickr:`
 * sources get no special treatment — they resolve like any other
 * filename (wdpr does not call the Flickr API).
 *
 * @module
 */
import type { Element, GalleryItem, GalleryOrder, GallerySize } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseAttributesRaw, parseBlockName } from "../utils";
import { parseGalleryItemLine } from "./items";

export { parseGalleryItemLine } from "./items";

const GALLERY_SIZES: readonly string[] = ["small", "medium", "thumbnail", "square", "original"];

/** Validate a size keyword, falling back to thumbnail like Wikidot. */
function normalizeSize(value: string | undefined): GallerySize {
  return value !== undefined && GALLERY_SIZES.includes(value)
    ? (value as GallerySize)
    : "thumbnail";
}

/** `viewer="no"` / `viewer="false"` disable the lightbox; anything else enables it. */
function normalizeViewer(value: string | undefined): boolean {
  return value !== "no" && value !== "false";
}

/**
 * Normalize the `order` attribute, folding Wikidot's deprecated aliases
 * (`nameDesc`, `dateAdded`, `dateAddedDesc`) and the documented
 * ListPages-compatibility forms (`"name desc desc"` / `"created_at desc
 * desc"`, which mean the same as without the `desc desc`).
 */
function normalizeOrder(value: string | undefined): GalleryOrder {
  switch (value) {
    case "name":
    case "name desc":
    case "created_at":
    case "created_at desc":
      return value;
    case "nameDesc":
      return "name desc";
    case "dateAdded":
      return "created_at";
    case "dateAddedDesc":
      return "created_at desc";
    case "name desc desc":
      return "name";
    case "created_at desc desc":
      return "created_at";
    default:
      return "name";
  }
}

interface GalleryContentResult {
  /** Trimmed line contents (after the leading `: `) */
  lines: string[];
  /** Token count from the content start (the NEWLINE after `]]`) through `[[/gallery]]` */
  consumed: number;
}

/**
 * Try to match the content form starting at `pos` (the token right after the
 * opening tag's `]]`): one NEWLINE, then consecutive `: source` lines, then a
 * NEWLINE directly followed by `[[/gallery]]`. Returns null when the token
 * stream deviates from the Wikidot regex, which makes the gallery standalone.
 */
function tryParseGalleryContent(ctx: ParseContext, pos: number): GalleryContentResult | null {
  const start = pos;
  if (ctx.tokens[pos]?.type !== "NEWLINE") {
    return null;
  }

  const lines: string[] = [];
  let p = pos + 1;

  for (;;) {
    const colon = ctx.tokens[p];
    if (colon?.type !== "COLON" || !colon.lineStart) {
      break;
    }
    // Wikidot requires a literal space after the colon (`\n: `)
    const space = ctx.tokens[p + 1];
    if (space?.type !== "WHITESPACE" || !space.value.startsWith(" ")) {
      break;
    }

    let content = "";
    let q = p + 1;
    while (q < ctx.tokens.length) {
      const token = ctx.tokens[q];
      if (!token || token.type === "NEWLINE" || token.type === "EOF") {
        break;
      }
      content += token.value;
      q++;
    }
    // `: [^\n]+` needs at least one character after the space
    if (content === " ") {
      return null;
    }
    if (ctx.tokens[q]?.type !== "NEWLINE") {
      // line hit EOF: the close tag can no longer follow on its own line
      return null;
    }

    lines.push(content.trim());
    p = q + 1;
  }

  if (lines.length === 0) {
    return null;
  }

  // The last consumed NEWLINE must be directly followed by [[/gallery]]
  if (ctx.tokens[p]?.type !== "BLOCK_END_OPEN") {
    return null;
  }
  const nameResult = parseBlockName(ctx, p + 1);
  if (!nameResult || nameResult.name !== "gallery") {
    return null;
  }
  const closePos = p + 1 + nameResult.consumed;
  if (ctx.tokens[closePos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return { lines, consumed: closePos + 1 - start };
}

export const galleryRule: BlockRule = {
  name: "gallery",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "gallery") {
      return { success: false };
    }
    pos += nameResult.consumed;

    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;

    const size = normalizeSize(attrResult.attrs.size);
    const viewer = normalizeViewer(attrResult.attrs.viewer);
    const order = normalizeOrder(attrResult.attrs.order);
    const openConsumed = pos - ctx.pos;

    const content = tryParseGalleryContent(ctx, pos);
    if (!content) {
      return {
        success: true,
        elements: [
          {
            element: "gallery",
            data: { size, order, viewer, content: { type: "auto", files: null } },
          },
        ],
        consumed: openConsumed,
      };
    }

    const items: GalleryItem[] = content.lines.map(parseGalleryItemLine);

    return {
      success: true,
      elements: [
        {
          element: "gallery",
          data: { size, order, viewer, content: { type: "items", items } },
        },
      ],
      consumed: openConsumed + content.consumed,
    };
  },
};
