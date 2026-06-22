import type { TokenType } from "../../../../../lexer/tokens";

export function isPipeTableToken(type: TokenType): boolean {
  switch (type) {
    case "TABLE_MARKER":
    case "TABLE_HEADER":
    case "TABLE_LEFT":
    case "TABLE_CENTER":
    case "TABLE_RIGHT":
      return true;
    default:
      return false;
  }
}
