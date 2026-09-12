import type { SocialData } from "@wdprlib/ast";
import type { Token } from "../../../../lexer";
import type { ParseContext } from "../../types";
import { findRawTagClose } from "../parsing/raw-tag";

const invalidBodies = new WeakMap<readonly Token[], { start: number; bracket: number }>();

export function parseSocialSyntax(
  ctx: ParseContext,
  start: number,
  end: number,
): { data: SocialData; end: number } | null {
  const tokens = ctx.tokens;
  if (tokens[start]?.type !== "BLOCK_OPEN" || tokens[start + 1]?.value.toLowerCase() !== "social")
    return null;
  const bodyStart = start + 2;
  if (tokens[bodyStart]?.type !== "BLOCK_CLOSE" && !/^\s+$/.test(tokens[bodyStart]?.value ?? ""))
    return null;
  const invalid = invalidBodies.get(tokens);
  if (invalid && bodyStart >= invalid.start && bodyStart <= invalid.bracket) return null;
  const close = findRawTagClose(tokens, bodyStart, end);
  if (close === null) return null;
  for (let pos = bodyStart; pos < close; pos++) {
    if (tokens[pos]!.value.includes("]")) {
      invalidBodies.set(tokens, { start: bodyStart, bracket: pos });
      return null;
    }
  }
  const body = tokens
    .slice(bodyStart, close)
    .map((token) => token.value)
    .join("");
  const sites = body.trim()
    ? body
        .split(",")
        .map((site) => site.trim().toLowerCase())
        .filter(Boolean)
    : null;
  return { data: { sites }, end: close + 1 };
}
