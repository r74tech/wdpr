import type { Token } from "../../../../lexer";

export interface ExprDepthStep {
  depth: number;
  shouldBreak: boolean;
}

export function advanceExprDepth(token: Token, depth: number): ExprDepthStep {
  if (token.type === "BLOCK_OPEN" || token.type === "BLOCK_END_OPEN" || token.type === "LINK_OPEN") {
    return { depth: depth + 1, shouldBreak: false };
  }

  if (token.type === "BLOCK_CLOSE" || token.type === "LINK_CLOSE") {
    if (depth === 0) {
      return { depth, shouldBreak: true };
    }
    return { depth: depth - 1, shouldBreak: false };
  }

  return { depth, shouldBreak: false };
}
