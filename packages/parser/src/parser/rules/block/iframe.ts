/**
 * @module iframe
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
 *   out `class` and `id`).
 *
 * Allowed attributes: `width`, `height`, `style`, `scrolling`, `frameborder`.
 */
import type { AttributeMap, Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Whitelist of attributes permitted on `[[iframe]]`. Wikidot strips
 * `class` and `id` for security reasons.
 */
const ALLOWED_IFRAME_ATTRS = new Set(["width", "height", "style", "scrolling", "frameborder"]);

/**
 * Normalises a URL string for security checks by removing whitespace and
 * control characters (U+0000--U+001F, U+007F--U+009F) that could be used
 * to evade scheme detection, then lowercasing the result.
 *
 * @param url - The raw URL string.
 * @returns The normalised, lowercased URL.
 */
function normalizeUrl(url: string): string {
  return url.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "").toLowerCase();
}

/**
 * Tests whether a normalised URL begins with a dangerous scheme
 * (`javascript:`, `data:`, `vbscript:`) that must be rejected.
 *
 * @param normalizedUrl - The URL after {@link normalizeUrl} processing.
 * @returns `true` if the URL has a dangerous scheme.
 */
function isDangerousUrl(normalizedUrl: string): boolean {
  return /^(javascript|data|vbscript):/i.test(normalizedUrl);
}

/**
 * Block rule for `[[iframe URL ...attributes]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "iframe".
 * 2. Consume the URL (all tokens until whitespace, BLOCK_CLOSE, or newline).
 * 3. Validate the URL: normalise, reject dangerous schemes, require http(s).
 * 4. Parse key/value attributes, filtering through {@link ALLOWED_IFRAME_ATTRS}.
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

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "iframe") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse URL (first argument)
    let url = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;
      if (token.type === "BLOCK_CLOSE" || token.type === "WHITESPACE" || token.type === "NEWLINE") {
        break;
      }
      url += token.value;
      pos++;
      consumed++;
    }

    if (!url) {
      return { success: false };
    }

    // Normalize URL for consistent security checks
    const normalizedUrl = normalizeUrl(url);

    // Reject dangerous URLs (javascript:, data:, vbscript:)
    // These will fall back to text rendering
    if (isDangerousUrl(normalizedUrl)) {
      return { success: false };
    }

    // Only allow http:// and https:// URLs (checked against normalized URL)
    // This blocks relative URLs and other schemes
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      return { success: false };
    }

    // Parse attributes
    const attributes: AttributeMap = {};

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "BLOCK_CLOSE") break;

      if (token.type === "NEWLINE") {
        break;
      }

      if (token.type === "WHITESPACE") {
        pos++;
        consumed++;
        continue;
      }

      // Parse key=value or key="value"
      if (token.type === "IDENTIFIER" || token.type === "TEXT") {
        const key = token.value;
        pos++;
        consumed++;

        // Skip whitespace
        while (ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }

        // Expect =
        if (ctx.tokens[pos]?.type === "EQUALS") {
          pos++;
          consumed++;

          // Skip whitespace
          while (ctx.tokens[pos]?.type === "WHITESPACE") {
            pos++;
            consumed++;
          }

          // Parse value
          let value = "";
          const valueToken = ctx.tokens[pos];
          if (valueToken?.type === "QUOTED_STRING") {
            // Remove quotes
            value = valueToken.value.slice(1, -1);
            pos++;
            consumed++;
          } else {
            // Unquoted value
            while (pos < ctx.tokens.length) {
              const vt = ctx.tokens[pos];
              if (
                !vt ||
                vt.type === "BLOCK_CLOSE" ||
                vt.type === "WHITESPACE" ||
                vt.type === "NEWLINE"
              ) {
                break;
              }
              value += vt.value;
              pos++;
              consumed++;
            }
          }

          // Only allow specific attributes (Wikidot filters out class/id)
          if (ALLOWED_IFRAME_ATTRS.has(key.toLowerCase())) {
            attributes[key.toLowerCase()] = value;
          }
        }
      } else {
        pos++;
        consumed++;
      }
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip trailing newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    return {
      success: true,
      elements: [
        {
          element: "iframe",
          data: {
            url,
            attributes,
          },
        },
      ],
      consumed,
    };
  },
};
