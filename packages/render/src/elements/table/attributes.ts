import { escapeAttr, sanitizeAttributes } from "../../escape";

export { renderTableCellAttrs } from "./cell-attributes";

export function renderTableAttrs(attributes: Record<string, string>): string {
  let hasRenderableAttributes = false;
  for (const key in attributes) {
    if (!key.startsWith("_")) {
      hasRenderableAttributes = true;
      break;
    }
  }
  if (!hasRenderableAttributes) return "";

  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const key in safe) {
    if (key.startsWith("_")) continue;
    const value = safe[key]!;
    result += ` ${key}="${escapeAttr(value)}"`;
  }
  return result;
}
