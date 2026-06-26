import { escapeAttr, sanitizeAttributes } from "../../escape";

/**
 * Sanitize and format an attribute map into an HTML attribute string.
 */
export function renderContainerAttrs(attributes: Record<string, string>): string {
  if (!hasAttributes(attributes)) {
    return "";
  }

  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const key in safe) {
    if (key.startsWith("_")) {
      continue;
    }
    const value = safe[key]!;
    result += value !== "" ? ` ${key}="${escapeAttr(value)}"` : ` ${key}=""`;
  }
  return result;
}

export function hasAttributes(attributes: Record<string, string>): boolean {
  for (const _ in attributes) {
    return true;
  }
  return false;
}
