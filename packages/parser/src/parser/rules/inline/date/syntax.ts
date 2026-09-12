import type { DateData } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAttributesRaw } from "../../block/parsing/attributes";

interface DateSyntax {
  data: DateData;
  end: number;
}

/** Read a complete date without registering any parser side effects. */
export function parseDateSyntax(ctx: ParseContext, start: number, end: number): DateSyntax | null {
  const tokens = ctx.tokens;
  if (tokens[start]?.type !== "BLOCK_OPEN" || tokens[start + 1]?.value !== "date") return null;
  let pos = start + 2;
  const skipSpace = () => {
    const before = pos;
    while (pos < end && /^(?:\s+)$/.test(tokens[pos]?.value ?? "")) pos++;
    return pos > before;
  };
  if (!skipSpace()) return null;
  const value = tokens[pos]?.value ?? "";
  if (pos >= end || !/^\d+$/.test(value)) return null;
  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp > 8_640_000_000_000) return null;
  pos++;
  const separator = skipSpace();
  if (tokens[pos]?.type !== "BLOCK_CLOSE" && !separator) return null;
  let close = pos;
  for (; close < end; close++) {
    const token = tokens[close];
    if (!token || token.type === "EOF" || token.type === "BLOCK_OPEN" || /[\r\n]/.test(token.value))
      return null;
    if (token.type === "BLOCK_CLOSE") break;
  }
  if (close >= end) return null;
  const attributes = parseAttributesRaw(ctx, pos).attrs;
  const format = attributes.format || null;
  return {
    data: {
      value: { timestamp, timezone: "UTC" },
      format,
      hover: format?.split("|").slice(1).includes("agohover") ?? false,
    },
    end: close + 1,
  };
}
