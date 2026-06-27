import type { TokenType } from "../../../../lexer";

export function guillemetText(tokenType: TokenType | undefined): string | null {
  if (tokenType === "LEFT_DOUBLE_ANGLE") {
    return "\u00AB";
  }
  if (tokenType === "RIGHT_DOUBLE_ANGLE") {
    return "\u00BB";
  }
  return null;
}
