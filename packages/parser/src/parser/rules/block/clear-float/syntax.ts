import type { ParseContext } from "../../types";

type ClearFloatDirection = "both" | "left" | "right";

export interface ClearFloatSyntax {
  direction: ClearFloatDirection;
  consumed: number;
}

export function parseClearFloatSyntax(ctx: ParseContext): ClearFloatSyntax | null {
  const token = ctx.tokens[ctx.pos];
  if (
    !token ||
    !token.lineStart ||
    (token.type !== "CLEAR_FLOAT" &&
      token.type !== "CLEAR_FLOAT_LEFT" &&
      token.type !== "CLEAR_FLOAT_RIGHT")
  ) {
    return null;
  }

  const tildeCount = token.value.replace(/[<>]$/, "").length;
  if (tildeCount < 4) {
    return null;
  }

  return {
    direction: clearFloatDirection(token.type),
    consumed: 1 + (ctx.tokens[ctx.pos + 1]?.type === "NEWLINE" ? 1 : 0),
  };
}

function clearFloatDirection(
  tokenType: "CLEAR_FLOAT" | "CLEAR_FLOAT_LEFT" | "CLEAR_FLOAT_RIGHT",
): ClearFloatDirection {
  if (tokenType === "CLEAR_FLOAT_LEFT") {
    return "left";
  }
  if (tokenType === "CLEAR_FLOAT_RIGHT") {
    return "right";
  }
  return "both";
}
