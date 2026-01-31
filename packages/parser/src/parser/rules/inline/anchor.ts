/**
 * Anchor rule: [[a]]...[[/a]] or [[anchor]]...[[/anchor]]
 *
 * Creates an anchor element (inline link wrapper).
 * Supports:
 * - [[a_]] - strips line breaks (paragraph strip mode)
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { inlineRules } from "../index";
import { sanitizeUrl as braintreeSanitizeUrl } from "@braintree/sanitize-url";
import { parseAttributes } from "../block/utils";
import { canApplyInlineRule } from "./utils";

/**
 * Sanitize URL to prevent XSS attacks using @braintree/sanitize-url
 * Returns #invalid-url for dangerous URLs (about:blank is the library's default)
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
 * Parse anchor block name with underscore (paragraph strip) flag
 * Returns score: true if underscore suffix is present
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

export const anchorRule: InlineRule = {
  name: "anchor",
  startTokens: ["BLOCK_OPEN"],

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

          // In paragraph strip mode, consume trailing newlines after close tag
          // This prevents line-breaks between consecutive [[a_]] blocks
          while (paragraphStrip && ctx.tokens[pos]?.type === "NEWLINE") {
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
