/**
 *
 * HTML, CSS, URL, and attribute sanitization utilities for the render pipeline.
 *
 * Every piece of user-supplied content that flows into the HTML output must
 * pass through one of these functions to prevent Cross-Site Scripting (XSS)
 * and CSS injection attacks.
 *
 * The module provides several layers of defense:
 * - Text escaping ({@link escapeHtml}, {@link escapeAttr}, {@link escapeJsString})
 * - URL scheme blocking ({@link isDangerousUrl}) against `javascript:`, `data:`, `vbscript:`
 * - Attribute allowlisting ({@link isSafeAttribute}) to block event handlers (`on*`)
 * - CSS value sanitization ({@link isDangerousCssValue}, {@link sanitizeStyleValue})
 *   with normalization to defeat CSS escape/comment bypass techniques
 * - Composite attribute sanitization ({@link sanitizeAttributes}) combining all checks
 *
 * @module
 */

/**
 * Escape the three HTML-special characters (`&`, `<`, `>`) in text content.
 *
 * Suitable for text nodes. For attribute values, use {@link escapeAttr}
 * which additionally escapes quotation marks.
 *
 * @param text - The raw text to escape.
 * @returns The escaped string safe for embedding in HTML text content.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escape a string for safe use inside an HTML attribute value.
 *
 * Stricter than {@link escapeHtml}: in addition to `&`, `<`, and `>`,
 * this also escapes both double and single quotes to prevent attribute
 * breakout regardless of which quote character delimits the attribute.
 *
 * @param value - The raw attribute value to escape.
 * @returns The escaped string safe for embedding in an HTML attribute.
 */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape content destined for a `<style>` tag to prevent tag breakout.
 *
 * An attacker could include `</style><script>...` inside CSS to close
 * the style element and inject a script. This function replaces every
 * occurrence of `</style` (case-insensitive) with `<\/style`, which
 * is harmless in CSS but prevents the HTML parser from seeing a
 * closing `</style>` tag.
 *
 * @param css - The raw CSS text to sanitize.
 * @returns The sanitized CSS string safe for embedding inside `<style>`.
 */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

/**
 * Escape a value for safe embedding inside a JavaScript string literal
 * that itself appears within an HTML attribute (e.g. `onclick="fn('...')"` ).
 *
 * Uses hex escapes (`\xNN`) and unicode escapes (`\uNNNN`) for characters
 * that could break either the JavaScript string or the enclosing HTML
 * attribute context: backslash, quotes, angle brackets, ampersand,
 * newlines, and the Unicode line/paragraph separators (U+2028/U+2029).
 *
 * @param value - The raw string to escape.
 * @returns The escaped string safe for use inside a JS string literal in HTML.
 */
export function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\x27")
    .replace(/"/g, "\\x22")
    .replace(/</g, "\\x3c")
    .replace(/>/g, "\\x3e")
    .replace(/&/g, "\\x26")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Allowlist of HTML attribute names considered safe for rendering.
 *
 * Based on the attributes that Wikidot permits users to set via markup.
 * Event handler attributes (`on*`) are explicitly blocked in
 * {@link isSafeAttribute}. The `aria-*` and `data-*` prefixes are
 * allowed dynamically rather than being listed here.
 */
const SAFE_ATTRIBUTES = new Set([
  "accept",
  "align",
  "alt",
  "autocapitalize",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "buffered",
  "checked",
  "cite",
  "class",
  "cols",
  "colspan",
  "contenteditable",
  "controls",
  "coords",
  "datetime",
  "decoding",
  "default",
  "dir",
  "dirname",
  "disabled",
  "download",
  "draggable",
  "for",
  "form",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inputmode",
  "ismap",
  "itemprop",
  "kind",
  "label",
  "lang",
  "list",
  "loop",
  "low",
  "max",
  "maxlength",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "optimum",
  "pattern",
  "placeholder",
  "poster",
  "preload",
  "readonly",
  "required",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "span",
  "spellcheck",
  "src",
  "srclang",
  "srcset",
  "start",
  "step",
  "style",
  "tabindex",
  "target",
  "title",
  "translate",
  "type",
  "usemap",
  "value",
  "width",
  "wrap",
]);

/**
 * Check whether an HTML attribute name is safe to include in rendered output.
 *
 * The check applies three rules in order:
 * 1. Block all event handlers (`on*` prefix) unconditionally
 * 2. Allow accessibility (`aria-*`) and custom data (`data-*`) attributes
 * 3. Allow only attributes in the `SAFE_ATTRIBUTES` allowlist
 *
 * @param name - The attribute name to validate (case-insensitive).
 * @returns `true` if the attribute is safe to render.
 */
export function isSafeAttribute(name: string): boolean {
  const lower = name.toLowerCase();
  // Block all event handlers
  if (lower.startsWith("on")) return false;
  // Allow aria-* and data-* prefixes
  if (lower.startsWith("aria-") || lower.startsWith("data-")) return true;
  return SAFE_ATTRIBUTES.has(lower);
}

/**
 * Check whether a URL contains a dangerous scheme (`javascript:`, `data:`, `vbscript:`).
 *
 * Before testing, the value is stripped of all whitespace and control
 * characters (U+0000-U+001F, U+007F-U+009F) to defeat evasion techniques
 * such as `"java\nscript:"` or `"java\x00script:"` that exploit browser
 * whitespace tolerance in URL parsing.
 *
 * @param value - The URL string to check.
 * @returns `true` if the URL uses a dangerous scheme and should be blocked.
 */
export function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "");
  return /^(javascript|data|vbscript):/i.test(normalized);
}

/**
 * Complete set of CSS Level 4 named colors plus CSS-wide keywords
 * (`transparent`, `currentcolor`, `inherit`, `initial`, `unset`).
 *
 * Used by {@link isValidCssColor} to validate color values without
 * allowing arbitrary CSS expressions.
 */
const CSS_NAMED_COLORS = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
  // Special values
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
]);

/**
 * Validate that a string is a safe CSS color value.
 *
 * Accepts named colors, hex notation (`#RGB`, `#RGBA`, `#RRGGBB`,
 * `#RRGGBBAA`), and functional notation (`rgb()`, `rgba()`, `hsl()`,
 * `hsla()`) with strictly numeric arguments.
 *
 * Rejects anything else -- including semicolons, `url()`, `expression()`,
 * and any other pattern that could be used for CSS injection.
 *
 * @param color - The CSS color value to validate.
 * @returns `true` if the value is a recognized safe color format.
 */
export function isValidCssColor(color: string): boolean {
  const trimmed = color.trim().toLowerCase();

  // Empty is invalid
  if (!trimmed) return false;

  // Named colors
  if (CSS_NAMED_COLORS.has(trimmed)) return true;

  // Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  if (/^#[0-9a-f]{3}([0-9a-f])?$/.test(trimmed) || /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(trimmed)) {
    return true;
  }

  // Extract function name and args separately to avoid ReDoS from repeated \s* quantifiers.
  // Only strip whitespace from args, keeping function name validation strict.
  const fnMatch = trimmed.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (fnMatch) {
    const fn = fnMatch[1]!;
    // Only trim whitespace around commas (structural delimiters), not within tokens
    const args = fnMatch[2]!
      .split(",")
      .map((s) => s.trim())
      .join(",");
    if (fn.startsWith("rgb")) {
      if (/^\d{1,3},\d{1,3},\d{1,3}(,(0|1|0?\.\d+))?$/.test(args)) return true;
    } else {
      if (/^\d{1,3},\d{1,3}%,\d{1,3}%(,(0|1|0?\.\d+))?$/.test(args)) return true;
    }
  }

  // Reject everything else (including semicolons, url(), expression(), etc.)
  return false;
}

/**
 * Sanitize a CSS color value, returning a fallback if validation fails.
 *
 * Delegates to {@link isValidCssColor} for validation. If the color
 * is not a recognized safe format, the fallback value is returned
 * instead (defaulting to `"inherit"`).
 *
 * @param color - The CSS color value to sanitize.
 * @param fallback - The value to return if validation fails (default `"inherit"`).
 * @returns The original color if valid, otherwise the fallback.
 */
export function sanitizeCssColor(color: string, fallback = "inherit"): string {
  return isValidCssColor(color) ? color : fallback;
}

/**
 * Normalize a CSS value by resolving escape sequences, removing comments,
 * stripping whitespace and control characters, and lowercasing.
 *
 * This normalization is critical for security: attackers can use CSS
 * comments (`/* ... *​/`), escape sequences (`\75rl` for `url`), and
 * line continuations to disguise dangerous patterns. By normalizing
 * first, the downstream checks in {@link isDangerousCssValue} operate
 * on a canonical representation.
 *
 * @param value - The raw CSS property value.
 * @returns The normalized, lowercase, whitespace-free representation.
 */
function normalizeCssValue(value: string): string {
  let result = value;

  // Remove CSS comments: /* ... */
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove CSS line continuations: backslash followed by newline
  result = result.replace(/\\(?:\r\n|[\n\r\f])/g, "");

  // Decode CSS escapes: \XX (hex) or \char
  // CSS allows \0-\10FFFF with optional trailing whitespace
  result = result.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => {
    const code = Number.parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });

  // Remove remaining backslash escapes: \char -> char
  result = result.replace(/\\(.)/g, "$1");

  // Remove whitespace and control characters
  result = result.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "");

  // Lowercase at the end to catch decoded uppercase chars (e.g., \55 -> U)
  return result.toLowerCase();
}

/**
 * Check whether a CSS property value contains dangerous patterns that
 * could enable script execution or external resource loading.
 *
 * The value is first normalized via `normalizeCssValue()` to resolve
 * CSS escapes and comments, then checked against a blocklist:
 * - `url()` -- blocks all URL-based loading (images, fonts, cursors)
 *   because even image URLs can leak data or trigger requests
 * - `expression()` -- blocks IE's CSS expression evaluation
 * - `-moz-binding` -- blocks Firefox XBL binding injection
 * - `behavior:` -- blocks IE behavior attachment
 * - `@import` -- blocks external stylesheet loading
 *
 * @param value - The CSS property value to check.
 * @returns `true` if the value contains a dangerous pattern and should be removed.
 */
export function isDangerousCssValue(value: string): boolean {
  const normalized = normalizeCssValue(value);

  // Block ALL url() - prevents all URL-based attacks
  if (normalized.includes("url(")) return true;

  // Block expression() (IE)
  if (normalized.includes("expression(")) return true;

  // Block -moz-binding (Firefox)
  if (normalized.includes("-moz-binding")) return true;

  // Block behavior (IE)
  if (normalized.includes("behavior:")) return true;

  // Block @import (can load external stylesheets)
  if (normalized.includes("@import")) return true;

  return false;
}

/**
 * Sanitize a `style` attribute value by removing dangerous declarations
 * while preserving safe ones.
 *
 * Splits the value on semicolons into individual declarations, checks
 * each declaration's value via {@link isDangerousCssValue}, and drops
 * any that fail. Also blocks the `-moz-binding` and `behavior`
 * property names directly.
 *
 * The original formatting is preserved: if the input ended with a
 * semicolon, the output will too (matching Wikidot's pass-through
 * behavior for user-authored styles).
 *
 * @param style - The raw `style` attribute value.
 * @returns The sanitized style string with dangerous declarations removed,
 *   or an empty string if nothing is safe.
 */
export function sanitizeStyleValue(style: string): string {
  // Remember if original ends with semicolon (Wikidot preserves this)
  const endsWithSemicolon = style.trimEnd().endsWith(";");

  // Split by semicolon into individual declarations
  const declarations = style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  const safe: string[] = [];

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;

    const property = decl.slice(0, colonIdx).trim().toLowerCase();
    const value = decl.slice(colonIdx + 1).trim();

    // Skip if value contains dangerous patterns
    if (isDangerousCssValue(value)) continue;

    // Skip dangerous properties
    if (property.startsWith("-moz-binding")) continue;
    if (property === "behavior") continue;

    // Keep original format (Wikidot outputs input as is)
    safe.push(decl);
  }

  if (safe.length === 0) return "";

  // Preserve original trailing semicolon format
  return endsWithSemicolon ? safe.join(";") + ";" : safe.join(";");
}

/**
 * Validate that a string looks like a safe email address.
 *
 * Uses a deliberately simple pattern that accepts the vast majority of
 * real-world addresses while blocking characters that could enable
 * injection attacks when the address is used in a `mailto:` link.
 *
 * The percent character (`%`) is intentionally disallowed because
 * `mailto:` URLs undergo percent-decoding, allowing an attacker to
 * inject headers (e.g. `a%0d%0abcc%3aevil@example.com` decodes to
 * a BCC header injection).
 *
 * @param email - The email string to validate.
 * @returns `true` if the email matches the safe pattern.
 */
export function isValidEmail(email: string): boolean {
  // Simple email pattern: local@domain
  // - local: alphanumeric, dots, underscores, hyphens, plus signs (NO percent)
  // - domain: alphanumeric, dots, hyphens
  // Does NOT allow: spaces, colons, angle brackets, percent, or other special chars
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Set of HTML attribute names whose values are interpreted as URLs
 * by the browser. Values of these attributes must be checked via
 * {@link isDangerousUrl} before rendering.
 */
const URL_ATTRIBUTES = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "srcset",
  "poster",
  "background",
]);

/**
 * Sanitize a map of HTML attributes, returning a new map containing
 * only entries that pass all safety checks.
 *
 * For each attribute, this function:
 * 1. Drops attributes that fail {@link isSafeAttribute} (event handlers, unknown names)
 * 2. Drops URL-bearing attributes whose values fail {@link isDangerousUrl}
 * 3. Sanitizes `style` values via {@link sanitizeStyleValue}, dropping them entirely
 *    if the result is empty
 * 4. Passes all other safe attributes through unchanged
 *
 * @param attributes - The raw attribute name-value map to sanitize.
 * @returns A new map containing only the safe attributes and their (possibly sanitized) values.
 */
export function sanitizeAttributes(attributes: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!isSafeAttribute(key)) continue;
    const lower = key.toLowerCase();
    // Check URL attributes for dangerous schemes
    if (URL_ATTRIBUTES.has(lower) && isDangerousUrl(value)) continue;
    // Sanitize style attribute
    if (lower === "style") {
      const sanitized = sanitizeStyleValue(value);
      if (sanitized) {
        result[key] = sanitized;
      }
      continue;
    }
    result[key] = value;
  }
  return result;
}
