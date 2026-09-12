/**
 * Paragraph rule
 *
 * Collects inline content until paragraph break (double newline) or end of input.
 * Line breaks within paragraphs are handled by the newlineLineBreakRule.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseInlineContent } from "./content";
import { normalizeParagraphElements } from "./normalize";
import { isPreservedLeadingLineBreak } from "../../inline/parsing/preserved-line-break";

/**
 * Paragraph is the fallback block rule.
 *
 * Wikidot behavior:
 * - Single newline -> <br> (handled by newlineLineBreakRule)
 * - Blank line (double newline) -> new paragraph
 */
export const paragraphRule: BlockRule = {
  name: "paragraph",
  startTokens: [],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const result = parseInlineContent(ctx);
    if (result.consumed === 0) {
      return { success: false };
    }

    const elements = normalizeParagraphElements(result.elements);
    if (elements.length === 0) {
      return { success: true, elements: [], consumed: result.consumed };
    }

    const nextPos = ctx.pos + result.consumed;
    const nextToken = ctx.tokens[nextPos];
    if (nextToken?.type === "COLON" && nextToken.lineStart) {
      if (isPreservedLeadingLineBreak(elements[0])) elements[0] = { element: "line-break" };
      return {
        success: true,
        elements: [...elements, { element: "line-break" }],
        consumed: result.consumed,
      };
    }

    return {
      success: true,
      elements: wrapParagraphElements(elements),
      consumed: result.consumed,
    };
  },
};

/** Block images split paragraphs; ordinary images suppress the surrounding p. */
export function wrapParagraphElements(elements: Element[]): Element[] {
  const output: Element[] = [];
  let group: Element[] = [];
  let bare = false;
  const flush = (trimBreaks = false) => {
    const content = trimBreaks ? normalizeParagraphElements(group) : group;
    while (content[0]?.element === "line-break" && !isPreservedLeadingLineBreak(content[0]))
      content.shift();
    while (content.length) {
      const last = content.at(-1)!;
      if (last.element !== "text" || last.data.trim() !== "") break;
      content.pop();
    }
    while (content[0]?.element === "text" && content[0].data.trim() === "") content.shift();
    if (content[0]?.element === "text")
      content[0] = { element: "text", data: content[0].data.trimStart() };
    if (isPreservedLeadingLineBreak(content[0])) content[0] = { element: "line-break" };
    if (content.length)
      output.push(
        ...(bare || content.some((el) => el.element === "image")
          ? content
          : [
              {
                element: "container" as const,
                data: { type: "paragraph" as const, attributes: {}, elements: content },
              },
            ]),
      );
    group = [];
  };
  for (const el of elements) {
    if ((el.element === "image" && el.data.alignment !== null) || el.element === "embed-block") {
      flush(el.element === "image");
      output.push(el);
      bare = el.element === "embed-block";
    } else group.push(el);
  }
  flush();
  return output;
}
