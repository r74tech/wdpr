/**
 *
 * Block rule for the Wikidot iframe block: `[[iframe URL attributes]]`.
 *
 * The `[[iframe]]` tag is a self-closing block that embeds an external
 * page in an `<iframe>`. The first argument after the block name is the
 * URL, followed by optional attributes.
 *
 * Security measures:
 * - Only `http://` and `https://` URLs are accepted.
 * - `javascript:`, `data:`, and `vbscript:` schemes are rejected.
 * - URL normalisation strips whitespace and control characters to prevent
 *   evasion via character insertion.
 * - Only a specific set of HTML attributes is allowed (Wikidot filters
 *   out `id` but permits `class`).
 *
 * Allowed attributes: `align`, `class`, `frameborder`, `height`,
 * `scrolling`, `style`, `width`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseIframeOpen } from "./open";
import { isAllowedIframeUrl } from "./url";

/**
 * Block rule for `[[iframe URL ...attributes]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "iframe".
 * 2. Consume the URL (all tokens until whitespace, BLOCK_CLOSE, or newline).
 * 3. Validate the URL: normalise, reject dangerous schemes, require http(s).
 * 4. Parse key/value attributes, filtering through `ALLOWED_IFRAME_ATTRS`.
 * 5. Consume closing `]]` and optional trailing newline.
 * 6. Emit an `iframe` element with `url` and `attributes`.
 */
export const iframeRule: BlockRule = {
  name: "iframe",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseIframeOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    if (!isAllowedIframeUrl(openResult.url)) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "iframe",
          data: {
            url: openResult.url,
            attributes: openResult.attributes,
          },
        },
      ],
      consumed: openResult.consumed,
    };
  },
};
