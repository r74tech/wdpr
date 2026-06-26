import { escapeAttr, sanitizeAttributes } from "../escape";

export function renderAttributeString(attributes: Record<string, string>): string {
  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const [key, value] of Object.entries(safe)) {
    if (value !== "") {
      result += ` ${key}="${escapeAttr(value)}"`;
    } else {
      result += ` ${key}=""`;
    }
  }
  return result;
}
