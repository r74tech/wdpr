import type { Element, ImageSource, FloatAlignment, Alignment, AttributeMap } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { filterUnsafeAttributes } from "../utils";
import { parseAttributesRaw } from "../block/utils";

/**
 * Parse image block name with alignment prefix handling
 * Handles =image, <image, >image, f<image, f>image
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
 * Determine ImageSource from source string
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
 * Convert alignment string to FloatAlignment
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

export const imageRule: InlineRule = {
  name: "image",
  startTokens: ["BLOCK_OPEN"],

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
