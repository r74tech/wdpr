import { isDangerousCssValue } from "./css-danger";
import { normalizeCssValue } from "./css-normalize";

/**
 * Sanitize a `style` attribute value by removing dangerous declarations
 * while preserving safe ones.
 */
export function sanitizeStyleValue(style: string): string {
  const endsWithSemicolon = style.trimEnd().endsWith(";");

  if (style.indexOf(";") === -1) {
    return sanitizeSingleDeclaration(style.trim());
  }

  const safe: string[] = [];
  for (const rawDecl of splitDeclarations(style)) {
    const decl = sanitizeSingleDeclaration(rawDecl.trim());
    if (decl) safe.push(decl);
  }

  if (safe.length === 0) return "";
  return endsWithSemicolon ? safe.join(";") + ";" : safe.join(";");
}

function sanitizeSingleDeclaration(decl: string): string {
  if (decl === "") return "";

  const colonIdx = decl.indexOf(":");
  if (colonIdx === -1) return "";

  const property = decl.slice(0, colonIdx).trim();
  const value = decl.slice(colonIdx + 1).trim();
  if (isDangerousCssValue(value)) return "";

  const normalisedProperty = normalizeCssValue(property);
  if (normalisedProperty.startsWith("-moz-binding")) return "";
  if (normalisedProperty === "behavior") return "";

  return decl;
}

/**
 * Split a CSS style attribute value into declarations, respecting
 * parentheses and quoted strings.
 */
function splitDeclarations(style: string): string[] {
  const out: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let quoteChar: string | null = null;

  for (let i = 0; i < style.length; i++) {
    const ch = style[i]!;
    if (quoteChar !== null) {
      if (ch === quoteChar) quoteChar = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch;
      continue;
    }
    if (ch === "(") {
      parenDepth++;
      continue;
    }
    if (ch === ")") {
      if (parenDepth > 0) parenDepth--;
      continue;
    }
    if (ch === ";" && parenDepth === 0) {
      out.push(style.slice(start, i));
      start = i + 1;
      continue;
    }
  }
  if (start < style.length) out.push(style.slice(start));
  return out;
}
