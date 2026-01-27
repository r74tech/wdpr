/**
 * Escape HTML special characters in text content
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escape HTML attribute value (stricter: escapes both quotes)
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
 * Escape content inside a <style> tag to prevent tag breakout.
 * Replaces `</style` (case-insensitive) with `<\/style`.
 */
export function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

/**
 * Escape a value for use inside a JavaScript string literal (within an HTML attribute).
 * Uses hex escapes for characters that could break either the JS string or the HTML attribute.
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

// Allowed attribute names (based on Wikidot usage)
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
 * Check if an attribute name is safe to render.
 * Blocks event handlers (on*) and unknown attributes.
 * Allows aria-* and data-* prefixes.
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
 * Check if a URL value contains a dangerous scheme.
 * Strips whitespace and control characters before checking to prevent evasion
 * (e.g. "java\nscript:" or "java\x00script:").
 */
export function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "");
  return /^(javascript|data|vbscript):/i.test(normalized);
}

// CSS named colors (CSS Level 4)
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
 * Validate a CSS color value.
 * Returns true if the value is a safe CSS color (named color, hex, rgb/rgba/hsl/hsla).
 * Rejects values containing semicolons, url(), expression(), or other dangerous patterns.
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

  // rgb() / rgba() - strict pattern to prevent injection
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
    return true;
  }

  // hsl() / hsla() - strict pattern to prevent injection
  if (
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)
  ) {
    return true;
  }

  // Reject everything else (including semicolons, url(), expression(), etc.)
  return false;
}

/**
 * Sanitize a CSS color value.
 * Returns the color if valid, otherwise returns the fallback color.
 */
export function sanitizeCssColor(color: string, fallback = "inherit"): string {
  return isValidCssColor(color) ? color : fallback;
}

/**
 * Normalize CSS value by removing escapes, comments, and control characters.
 * This prevents bypass attempts using CSS escape sequences or comments.
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
 * Check if a CSS property value contains dangerous patterns.
 * Used for sanitizing style attribute values.
 *
 * Security note: We normalize the value first to handle CSS escapes and comments,
 * then block ALL url() usage to prevent any bypass attempts.
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
 * Sanitize a style attribute value.
 * Removes dangerous CSS patterns while preserving safe styles.
 * Preserves original format (trailing semicolon presence).
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
 * Validate email format to prevent injection attacks.
 * Uses a simple pattern that allows most valid emails while blocking dangerous inputs.
 *
 * Security note: % is NOT allowed to prevent mailto: percent-decode attacks
 * (e.g., a%0d%0abcc%3aevil@example.com could inject headers).
 */
export function isValidEmail(email: string): boolean {
  // Simple email pattern: local@domain
  // - local: alphanumeric, dots, underscores, hyphens, plus signs (NO percent)
  // - domain: alphanumeric, dots, hyphens
  // Does NOT allow: spaces, colons, angle brackets, percent, or other special chars
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

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
 * Sanitize an attribute map, removing dangerous attributes and values.
 * Returns a new map with only safe entries.
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
