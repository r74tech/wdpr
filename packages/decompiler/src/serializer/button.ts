import type { PageButtonData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { literalizeWikitext } from "./directive-safety";

// Unlike generic directives, Button permits newlines inside quoted values.
function safeValue(value: string): boolean {
  return !/"|\[\[|\]\]/.test(value);
}

function quote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\")}"`;
}

export function serializeButton(ctx: SerializeContext, data: PageButtonData): void {
  if (!/^[a-z0-9_-]+$/i.test(data.action) || (data.text !== null && !safeValue(data.text))) {
    ctx.push(literalizeWikitext(data.text ?? data.action));
    return;
  }
  let attrs = data.text === null ? "" : ` text=${quote(data.text)}`;
  for (const name of ["class", "style"]) {
    const value = data.attributes[name];
    if (value !== undefined && safeValue(value)) attrs += ` ${name}=${quote(value)}`;
  }
  ctx.push(`[[button ${data.action}${attrs}]]`);
}
