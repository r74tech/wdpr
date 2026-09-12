import type { PageButtonData } from "@wdprlib/ast";
import { findRawTagClose } from "../parsing/raw-tag";
import type { ParseContext } from "../../types";
import { parseButtonAttributes } from "./attributes";

interface ButtonSyntax {
  data: PageButtonData;
  end: number;
}

/** Read a complete standalone button, including permitted separator newlines. */
export function parseButtonSyntax(
  ctx: ParseContext,
  start: number,
  end: number,
): ButtonSyntax | null {
  const tokens = ctx.tokens;
  if (tokens[start]?.type !== "BLOCK_OPEN" || tokens[start + 1]?.value.toLowerCase() !== "button")
    return null;
  let pos = start + 2;
  const skipSpace = () => {
    const before = pos;
    while (pos < end && /^\s+$/.test(tokens[pos]?.value ?? "")) pos++;
    return pos > before;
  };
  if (!skipSpace()) return null;
  let action = "";
  while (
    pos < end &&
    tokens[pos]?.type !== "BLOCK_CLOSE" &&
    !/^\s+$/.test(tokens[pos]?.value ?? "")
  ) {
    const part = tokens[pos]?.value ?? "";
    if (!/^[a-z0-9_-]+$/i.test(part)) return null;
    action += part;
    pos++;
  }
  if (!action) return null;
  action = action.replaceAll("_", "-");
  skipSpace();
  const close = findRawTagClose(tokens, pos, end);
  if (close === null) return null;
  const attrs = parseButtonAttributes(
    tokens
      .slice(pos, close)
      .map((token) => token.value)
      .join(""),
  );
  const value = (key: string) => (attrs[key] && attrs[key] !== "0" ? attrs[key]! : null);
  const attributes: Record<string, string> = {};
  for (const name of ["class", "style"]) {
    const attr = value(name);
    if (attr !== null) attributes[name] = attr;
  }
  return { data: { action, text: value("text"), attributes }, end: close + 1 };
}
