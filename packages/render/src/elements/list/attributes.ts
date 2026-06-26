import { escapeAttr, sanitizeAttributes } from "../../escape";

export function renderListAttrs(attributes: Record<string, string>): string {
  let hasAttributes = false;
  for (const _ in attributes) {
    hasAttributes = true;
    break;
  }
  if (!hasAttributes) return "";

  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const key in safe) {
    if (key.startsWith("_")) continue;
    const value = safe[key]!;
    result += ` ${key}="${escapeAttr(value)}"`;
  }
  return result;
}
