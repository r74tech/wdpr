/**
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
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseImageOpen } from "./open";
import { parseAlignment, parseImageSource } from "./source";

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

    const openResult = parseImageOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    const source = parseImageSource(openResult.sourceText);
    const alignment = parseAlignment(openResult.blockName);

    return {
      success: true,
      elements: [
        {
          element: "image",
          data: {
            source,
            link: openResult.link,
            alignment,
            attributes: openResult.attributes,
          },
        },
      ],
      consumed: openResult.consumed,
    };
  },
};
