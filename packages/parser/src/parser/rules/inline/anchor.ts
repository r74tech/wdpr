/**
 *
 * Parses the Wikidot anchor inline block syntax: `[[a]]...[[/a]]`.
 *
 * An anchor wraps inline content in an HTML `<a>` element, allowing
 * href, target, and other HTML attributes to be specified.
 *
 * Wikidot syntax variants:
 * - `[[a href="url"]]text[[/a]]` -- basic anchor with href
 * - `[[a_ href="url"]]text[[/a]]` -- paragraph strip mode (trailing underscore)
 *
 * Paragraph strip mode (`[[a_]]`) suppresses newlines within the anchor
 * body and strips at most one trailing newline after the closing tag
 * (preserving double newlines as paragraph breaks). This prevents
 * unwanted `<br>` elements when consecutive anchor blocks are placed on
 * separate lines.
 *
 * The `target` attribute is extracted and mapped to a semantic enum value
 * (`"new-tab"`, `"parent"`, `"top"`, `"same"`), while the remaining
 * attributes (including `href`) are passed through after URL sanitization.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { inlineRules } from "../index";
import { sanitizeUrl as braintreeSanitizeUrl } from "@braintree/sanitize-url";
import { parseAttributes } from "../block/utils";
import { canApplyInlineRule } from "./utils";

/**
 * Sanitizes a URL to prevent XSS attacks via dangerous URI schemes.
 *
 * Applies two layers of protection:
 * 1. Pre-checks the whitespace-normalized URL against known dangerous schemes
 *    (`javascript:`, `data:`, `vbscript:`), catching evasion attempts like
 *    `"java script:"` with embedded whitespace.
 * 2. Delegates to `@braintree/sanitize-url` for additional validation.
 *
 * Returns the original URL (not the normalized form) to avoid unintended
 * modifications such as trailing-slash addition.
 *
 * @param url - The raw URL string to sanitize
 * @returns The original URL if safe, or `"#invalid-url"` if the URL is deemed dangerous
 */
function sanitizeUrl(url: string): string {
  // Pre-process: normalize whitespace to catch evasion attempts like "java script:"
  const normalizedForCheck = url.replace(/[\s\u0000-\u001f]/g, "").toLowerCase();

  // Check for dangerous schemes after whitespace normalization
  const dangerousSchemes = ["javascript:", "data:", "vbscript:"];
  for (const scheme of dangerousSchemes) {
    if (normalizedForCheck.startsWith(scheme)) {
      return "#invalid-url";
    }
  }

  // Use library for additional checks
  const sanitized = braintreeSanitizeUrl(url);
  if (sanitized === "about:blank") {
    return "#invalid-url";
  }

  // Return original URL to avoid unwanted normalization (e.g., trailing slash addition)
  return url;
}

/**
 * Parses the block name portion of an anchor open/close tag, handling the
 * optional underscore suffix that activates paragraph strip mode.
 *
 * Recognizes `a`, `anchor`, `a_`, and `anchor_` (case-insensitive).
 * The underscore suffix is reported via the `score` field so the caller
 * can decide how to handle newlines inside the anchor body.
 *
 * @param ctx - The current parse context containing the token stream
 * @param startPos - Token index at which to begin scanning
 * @returns An object with the lowercased name (including trailing `_` if present),
 *          a `score` boolean indicating paragraph strip mode, and the number of
 *          tokens consumed -- or `null` if no valid anchor block name was found
 */
function parseAnchorBlockName(
  ctx: ParseContext,
  startPos: number,
): { name: string; score: boolean; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Skip whitespace
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const token = ctx.tokens[pos];
  if (!token || (token.type !== "TEXT" && token.type !== "IDENTIFIER")) {
    return null;
  }

  let name = token.value.toLowerCase();
  consumed++;
  pos++;

  // Check for underscore suffix (paragraph strip)
  let score = false;
  if (ctx.tokens[pos]?.type === "UNDERSCORE") {
    score = true;
    name += "_";
    consumed++;
    pos++;
  }

  return { name, score, consumed };
}

/**
 * Inline rule for parsing `[[a]]...[[/a]]` blocks.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. The rule verifies the block name
 * is `a` or `anchor` (optionally with `_` suffix), parses HTML attributes,
 * then recursively parses inline content until the matching closing tag.
 *
 * Produces an `"anchor"` AST element containing the parsed children, a
 * semantic `target` value, and the sanitized attribute map.
 *
 * Edge cases:
 * - If no matching closing tag is found, the rule fails (returns `{ success: false }`),
 *   allowing the tokens to fall through to other rules or the text fallback.
 * - In paragraph strip mode, newlines within the body are consumed silently
 *   rather than converted to line-break elements. After the closing tag,
 *   at most one trailing newline is consumed to prevent a line-break between
 *   consecutive `[[a_]]` blocks, but double newlines are preserved as
 *   paragraph breaks.
 * - The `href` attribute is sanitized to block `javascript:`, `data:`, and
 *   `vbscript:` schemes.
 */
export const anchorRule: InlineRule = {
  name: "anchor",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse an anchor block starting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"anchor"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name with flags
    const nameResult = parseAnchorBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const baseName = nameResult.name.replace(/_$/, "");
    if (baseName !== "a" && baseName !== "anchor") {
      return { success: false };
    }

    const paragraphStrip = nameResult.score;

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes
    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse content until [[/a]] or [[/anchor]]
    const children: Element[] = [];
    let foundClose = false;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for closing tag
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseAnchorBlockName(ctx, pos + 1);
        const closeBaseName = closeNameResult?.name.replace(/_$/, "");
        if (closeNameResult && (closeBaseName === "a" || closeBaseName === "anchor")) {
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed;
          consumed += closeNameResult.consumed;
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          foundClose = true;

          // In paragraph strip mode, consume one trailing newline after close tag
          // This prevents a line-break between consecutive [[a_]] blocks
          // but preserves paragraph breaks (double newlines)
          if (
            paragraphStrip &&
            ctx.tokens[pos]?.type === "NEWLINE" &&
            ctx.tokens[pos + 1]?.type !== "NEWLINE"
          ) {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Handle NEWLINE
      if (token.type === "NEWLINE") {
        if (paragraphStrip) {
          // Skip newlines in paragraph strip mode
          pos++;
          consumed++;
          continue;
        }
        // Convert to line-break
        children.push({ element: "line-break" });
        pos++;
        consumed++;
        // Skip leading whitespace after newline
        while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
          pos++;
          consumed++;
        }
        continue;
      }

      // Skip whitespace at line start
      if (token.type === "WHITESPACE" && token.lineStart) {
        pos++;
        consumed++;
        continue;
      }

      // Try each inline rule
      let matched = false;
      const inlineCtx: ParseContext = { ...ctx, pos };

      for (const rule of inlineRules) {
        if (canApplyInlineRule(rule, token)) {
          const result = rule.parse(inlineCtx);
          if (result.success) {
            children.push(...result.elements);
            pos += result.consumed;
            consumed += result.consumed;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        children.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    if (!foundClose) {
      return { success: false };
    }

    // Clean up children - remove leading/trailing line breaks if paragraph strip
    if (paragraphStrip) {
      while (children.length > 0 && children[0]?.element === "line-break") {
        children.shift();
      }
      while (children.length > 0 && children[children.length - 1]?.element === "line-break") {
        children.pop();
      }
    }

    // Determine target from attributes
    let target: "new-tab" | "parent" | "top" | "same" | null = null;
    const targetAttr = attrResult.attrs.target;
    if (targetAttr === "_blank") target = "new-tab";
    else if (targetAttr === "_parent") target = "parent";
    else if (targetAttr === "_top") target = "top";
    else if (targetAttr === "_self") target = "same";

    // Remove target from attributes (href stays in attributes)
    const { target: _t, ...cleanAttrs } = attrResult.attrs;

    // Sanitize href to prevent XSS
    if (cleanAttrs.href) {
      cleanAttrs.href = sanitizeUrl(cleanAttrs.href);
    }

    return {
      success: true,
      elements: [
        {
          element: "anchor",
          data: {
            target,
            attributes: cleanAttrs,
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
