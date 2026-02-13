import type { Element as DomElement } from "domhandler";

interface StyleProperty {
  property: string;
  value: string;
}

/**
 * Parse a CSS style string into an array of property–value pairs.
 *
 * @param style - Raw CSS style attribute value (e.g. `"color: red; font-size: 12px;"`)
 * @returns Parsed property–value pairs
 */
export function parseStyleProperties(style: string): StyleProperty[] {
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const colonIndex = s.indexOf(":");
      if (colonIndex === -1) return null;
      return {
        property: s.slice(0, colonIndex).trim(),
        value: s.slice(colonIndex + 1).trim(),
      };
    })
    .filter((p): p is StyleProperty => p !== null);
}

/**
 * Check whether a CSS style string contains exactly one property matching
 * the given name.
 *
 * @example
 * hasOnlyStyleProperty("font-size: 20px", "font-size")          // true
 * hasOnlyStyleProperty("font-size: 20px; color: red", "font-size") // false
 */
export function hasOnlyStyleProperty(style: string, property: string): boolean {
  const props = parseStyleProperties(style);
  return props.length === 1 && props[0]?.property === property;
}

/**
 * Extract the value of a specific CSS property from a style string.
 *
 * @returns The property value, or `null` if not found
 */
export function getStyleValue(style: string, property: string): string | null {
  const props = parseStyleProperties(style);
  const found = props.find((p) => p.property === property);
  return found?.value ?? null;
}

/**
 * Recursively extract the text content of a DOM node.
 *
 * `&nbsp;` (U+00A0) is normalised to a regular space.
 */
export function getTextContent(node: DomElement): string {
  let result = "";
  for (const child of node.childNodes) {
    if (child.type === "text") {
      result += child.data;
    } else if ("childNodes" in child) {
      result += getTextContent(child as DomElement);
    }
  }
  return result.replace(/\u00a0/g, " ");
}
