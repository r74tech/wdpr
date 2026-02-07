/**
 * @module image
 *
 * Parses the Wikidot image block syntax: `[[image source attributes]]`.
 *
 * Images support several alignment/float prefixes that modify how the
 * image is positioned on the page:
 * - `[[image src]]` -- default (no alignment)
 * - `[[=image src]]` -- centered
 * - `[[<image src]]` -- left-aligned
 * - `[[>image src]]` -- right-aligned
 * - `[[f<image src]]` -- float left
 * - `[[f>image src]]` -- float right
 * - `[[f=image src]]` -- float center
 *
 * Image sources can be:
 * - Full URLs (`http://...`, `https://...`, `/path`)
 * - Local file references in three formats:
 *   - `file.ext` (file on current page, type `file1`)
 *   - `page/file.ext` (file on another page, type `file2`)
 *   - `site:page/file.ext` or `site/page/file.ext` (cross-site file, type `file3`)
 *
 * Optional attributes follow the source (e.g. `alt`, `title`, `width`,
 * `height`, `style`, `class`, `link`). The `link` attribute is treated
 * specially: it wraps the image in a hyperlink rather than being applied
 * as an HTML attribute. Unsafe attributes are filtered out.
 *
 * Produces an `"image"` AST element with source, alignment, link, and
 * attribute data.
 */
import type { Element, ImageSource, FloatAlignment, Alignment, AttributeMap } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { filterUnsafeAttributes } from "../utils";
import { parseAttributesRaw } from "../block/utils";

/**
 * Parses the block name portion of an image tag, including alignment
 * prefix characters.
 *
 * The alignment prefix may consist of `=`, `<`, `>`, `f<`, `f>`, or `f=`,
 * each tokenized differently depending on the lexer's context (e.g. `>`
 * may appear as either a `TEXT` token or a `BLOCKQUOTE_MARKER`).
 *
 * @param ctx - The current parse context
 * @param startPos - Token index at which to begin scanning
 * @returns An object with the combined lowercased name (prefix + "image")
 *          and the number of tokens consumed, or `null` if no valid image
 *          block name was found
 */
function parseImageBlockName(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let prefix = "";
  const token = ctx.tokens[pos];

  // Handle prefix characters for image variants: =image, <image, >image, f<image, f>image
  // These are tokenized as separate tokens: EQUALS/TEXT + IDENTIFIER
  if (token?.type === "EQUALS") {
    // =image (center)
    prefix = "=";
    pos++;
    consumed++;
  } else if (token?.type === "TEXT" && token.value === "<") {
    // <image (left align)
    prefix = "<";
    pos++;
    consumed++;
  } else if (token?.type === "TEXT" && token.value === ">") {
    // >image (right align)
    prefix = ">";
    pos++;
    consumed++;
  } else if (token?.type === "BLOCKQUOTE_MARKER" && token.value === ">") {
    // >image (right align) - may also be tokenized as BLOCKQUOTE_MARKER
    prefix = ">";
    pos++;
    consumed++;
  } else if (token?.type === "IDENTIFIER" && token.value.toLowerCase() === "f") {
    // Check for f<, f>, or f=
    const nextToken = ctx.tokens[pos + 1];
    if (nextToken?.type === "TEXT" && nextToken.value === "<") {
      prefix = "f<";
      pos += 2;
      consumed += 2;
    } else if (nextToken?.type === "TEXT" && nextToken.value === ">") {
      prefix = "f>";
      pos += 2;
      consumed += 2;
    } else if (nextToken?.type === "BLOCKQUOTE_MARKER" && nextToken.value === ">") {
      prefix = "f>";
      pos += 2;
      consumed += 2;
    } else if (nextToken?.type === "EQUALS") {
      // f=image (float center)
      prefix = "f=";
      pos += 2;
      consumed += 2;
    }
  }

  const nameToken = ctx.tokens[pos];
  if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
    return null;
  }

  return { name: prefix + nameToken.value.toLowerCase(), consumed: consumed + 1 };
}

/**
 * Determines the {@link ImageSource} type and data from a raw source string.
 *
 * Classification logic:
 * - Strings starting with `http://`, `https://`, or `/` are URL sources.
 * - Strings containing a colon before a slash (e.g. `site:page/file`) are
 *   `file3` (cross-site) references.
 * - Strings with 2+ slashes (e.g. `site/page/file`) are also `file3`.
 * - Strings with exactly 1 slash (e.g. `page/file`) are `file2` references.
 * - Strings with no slashes are `file1` (current-page file) references.
 *
 * @param src - The raw image source string from the markup
 * @returns An {@link ImageSource} object describing the source type and data
 */
function parseImageSource(src: string): ImageSource {
  // URL sources
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return { type: "url", data: src };
  }

  // File references - determine type based on format
  // file3: site:page/file or site/page/file (2+ slashes)
  // file2: page/file (1 slash)
  // file1: file (no slash)
  const colonIdx = src.indexOf(":");
  const slashIdx = src.indexOf("/");

  if (colonIdx > 0 && slashIdx > colonIdx) {
    // site:page/file format (colon-based)
    const site = src.substring(0, colonIdx);
    const rest = src.substring(colonIdx + 1);
    const lastSlash = rest.lastIndexOf("/");
    const page = rest.substring(0, lastSlash);
    const file = rest.substring(lastSlash + 1);
    return { type: "file3", data: { site, page, file } };
  }

  // Count slashes to determine format
  const slashes = src.split("/").length - 1;
  if (slashes >= 2) {
    // site/page/file format (2+ slashes = file3)
    const firstSlash = src.indexOf("/");
    const lastSlash = src.lastIndexOf("/");
    const site = src.substring(0, firstSlash);
    const page = src.substring(firstSlash + 1, lastSlash);
    const file = src.substring(lastSlash + 1);
    return { type: "file3", data: { site, page, file } };
  }
  if (slashIdx > 0) {
    // page/file format (1 slash = file2)
    const page = src.substring(0, slashIdx);
    const file = src.substring(slashIdx + 1);
    return { type: "file2", data: { page, file } };
  }

  // Just file
  return { type: "file1", data: { file: src } };
}

/**
 * Converts the image block name (including its alignment prefix) into a
 * {@link FloatAlignment} descriptor.
 *
 * The prefix portion of the block name determines both the alignment
 * direction and whether the image should float. A plain `"image"` name
 * (no prefix) returns `null`, indicating no explicit alignment.
 *
 * @param blockName - The lowercased block name (e.g. `"f>image"`, `"=image"`, `"image"`)
 * @returns A {@link FloatAlignment} object with `align` and `float` fields,
 *          or `null` for the unprefixed `"image"` form
 */
function parseAlignment(blockName: string): FloatAlignment | null {
  let align: Alignment = "left";
  let float = false;

  if (blockName === "=image") {
    align = "center";
  } else if (blockName === "<image") {
    align = "left";
  } else if (blockName === ">image") {
    align = "right";
  } else if (blockName === "f<image") {
    align = "left";
    float = true;
  } else if (blockName === "f>image") {
    align = "right";
    float = true;
  } else if (blockName === "f=image") {
    align = "center";
    float = true;
  } else if (blockName === "image") {
    return null;
  }

  return { align, float };
}

/**
 * Inline rule for parsing `[[image source attributes]]` and its alignment variants.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. The rule identifies the image
 * block name (with optional alignment prefix), extracts the image source,
 * parses remaining attributes, filters unsafe attributes, and extracts the
 * `link` attribute for special handling.
 *
 * Fails if the block name is not an image variant, if no source is provided,
 * or if `]]` is not found.
 */
export const imageRule: InlineRule = {
  name: "image",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse an image block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"image"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseImageBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    // Check for image, =image, <image, >image, f<image, f>image, f=image
    const blockName = nameResult.name;
    const imageNames = ["image", "=image", "<image", ">image", "f<image", "f>image", "f=image"];
    if (!imageNames.includes(blockName)) {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Get image source (collect tokens until whitespace or ]])
    let src = "";
    while (pos < ctx.tokens.length) {
      const srcToken = ctx.tokens[pos];
      if (
        !srcToken ||
        srcToken.type === "WHITESPACE" ||
        srcToken.type === "BLOCK_CLOSE" ||
        srcToken.type === "NEWLINE" ||
        srcToken.type === "EOF"
      ) {
        break;
      }
      src += srcToken.value;
      pos++;
      consumed++;
    }

    // Parse remaining attributes (raw, before safety filtering)
    const attrResultRaw = parseAttributesRaw(ctx, pos, false);
    pos += attrResultRaw.consumed;
    consumed += attrResultRaw.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Wikidot requires image source - [[image]] without source fails
    if (!src) {
      return { success: false };
    }

    // Parse source and alignment
    const source = parseImageSource(src);
    const alignment = parseAlignment(blockName);

    // Extract link before filtering (link is image-specific, not an HTML attribute)
    const linkUrl = attrResultRaw.attrs.link;
    const { link: _link, ...restAttrs } = attrResultRaw.attrs;
    const cleanAttrs = filterUnsafeAttributes(restAttrs);

    return {
      success: true,
      elements: [
        {
          element: "image",
          data: {
            source,
            link: linkUrl ?? null,
            alignment,
            attributes: cleanAttrs as AttributeMap,
          },
        },
      ],
      consumed,
    };
  },
};
