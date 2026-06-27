import { sanitizeUrl as braintreeSanitizeUrl } from "@braintree/sanitize-url";

export type AnchorTarget = "new-tab" | "parent" | "top" | "same";

export interface AnchorAttributes {
  target: AnchorTarget | null;
  attributes: Record<string, string>;
}

export function buildAnchorAttributes(attrs: Record<string, string>): AnchorAttributes {
  const target = parseAnchorTarget(attrs.target);
  const { target: _target, ...cleanAttrs } = attrs;

  if (cleanAttrs.href) {
    cleanAttrs.href = sanitizeUrl(cleanAttrs.href);
  }

  return { target, attributes: cleanAttrs };
}

function parseAnchorTarget(targetAttr: string | undefined): AnchorTarget | null {
  if (targetAttr === "_blank") return "new-tab";
  if (targetAttr === "_parent") return "parent";
  if (targetAttr === "_top") return "top";
  if (targetAttr === "_self") return "same";
  return null;
}

function sanitizeUrl(url: string): string {
  const normalizedForCheck = stripControlAndWhitespace(url).toLowerCase();
  const dangerousSchemes = ["javascript:", "data:", "vbscript:"];
  for (const scheme of dangerousSchemes) {
    if (normalizedForCheck.startsWith(scheme)) {
      return "#invalid-url";
    }
  }

  const sanitized = braintreeSanitizeUrl(url);
  return sanitized === "about:blank" ? "#invalid-url" : url;
}

const WHITESPACE = /\s/;

function stripControlAndWhitespace(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (WHITESPACE.test(char) || code <= 0x1f) {
      continue;
    }
    result += char;
  }
  return result;
}
