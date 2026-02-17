import type { SerializeContext } from "./context";

/** Map of Unicode characters to their original Wikidot source syntax. */
const UNICODE_TO_SOURCE: [string, string][] = [
  ["\u00AB", "<<"], // « → <<
  ["\u00BB", ">>"], // » → >>
  ["\u2014", "--"], // — → --
];

/**
 * Serialize a text element.
 *
 * Certain Unicode characters that Wikidot generates from source syntax
 * (e.g. `«` from `<<`) are converted back to their source form.
 */
export function serializeText(ctx: SerializeContext, data: string): void {
  let text = data;
  for (const [unicode, source] of UNICODE_TO_SOURCE) {
    text = text.replaceAll(unicode, source);
  }
  ctx.push(text);
}

/** Serialize a raw (pre-formatted) element as `@@text@@`. */
export function serializeRaw(ctx: SerializeContext, data: string): void {
  ctx.push(`@@${data}@@`);
}

/**
 * Serialize a line-break element.
 *
 * At line start or inside lists/definition-lists, uses the explicit
 * ` _\n` syntax. Otherwise, emits a bare newline (which Wikidot
 * renders as `<br>` inside paragraphs).
 */
export function serializeLineBreak(ctx: SerializeContext): void {
  if (ctx.isAtLineStart() || ctx.forceLineBreakSyntax) {
    ctx.push(" _" + ctx.newline);
  } else {
    ctx.push(ctx.newline);
  }
}

/** Serialize a horizontal rule as `----`. */
export function serializeHorizontalRule(ctx: SerializeContext): void {
  ctx.pushBlockLine("----");
  ctx.requestBlankLine();
}

/** Serialize a content separator as `====`. */
export function serializeContentSeparator(ctx: SerializeContext): void {
  ctx.pushBlockLine("====");
}

/** Serialize an email address as plain text (Wikidot auto-detects emails). */
export function serializeEmail(ctx: SerializeContext, data: string): void {
  ctx.push(data);
}
