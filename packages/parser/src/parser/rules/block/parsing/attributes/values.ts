import type { Token } from "../../../../../lexer";
import { isAttributeNameToken } from "./names";

export interface AttributeValueResult {
  value: string;
}

export function consumeAttributeValue(token: Token | undefined): AttributeValueResult | null {
  if (!token) {
    return null;
  }

  if (token.type === "QUOTED_STRING") {
    return { value: stripQuotes(token.value) };
  }

  if (isAttributeNameToken(token)) {
    return { value: token.value };
  }

  return null;
}

function stripQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}
