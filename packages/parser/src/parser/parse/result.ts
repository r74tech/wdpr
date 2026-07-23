import type { Element, ParseResult, SyntaxTree } from "@wdprlib/ast";
import type { ParseContext } from "../rules";
import {
  cleanInternalFlags,
  mergeSpanStripParagraphs,
  suppressDivAdjacentParagraphs,
} from "../postprocess";
import { buildTableOfContents } from "../toc";
import { containsFootnoteBlock } from "./footnotes";

export function finalizeParseResult(ctx: ParseContext, children: Element[]): ParseResult {
  const cleanedChildren = postprocessChildren(children);
  if (ctx.appendImplicitFootnoteBlock) {
    appendImplicitFootnoteBlock(cleanedChildren);
  }

  return {
    ast: buildSyntaxTree(ctx, cleanedChildren),
    diagnostics: ctx.diagnostics,
  };
}

function postprocessChildren(children: Element[]): Element[] {
  const mergedChildren = mergeSpanStripParagraphs(children);
  const divProcessed = suppressDivAdjacentParagraphs(mergedChildren);
  return cleanInternalFlags(divProcessed);
}

function appendImplicitFootnoteBlock(elements: Element[]): void {
  if (containsFootnoteBlock(elements)) return;

  elements.push({
    element: "footnote-block",
    data: { title: null, hide: false },
  });
}

function buildSyntaxTree(ctx: ParseContext, elements: Element[]): SyntaxTree {
  const tableOfContents = buildTableOfContents(ctx.tocEntries);
  const result: SyntaxTree = { elements };

  if (tableOfContents.length > 0) {
    result["table-of-contents"] = tableOfContents;
  }

  if (ctx.footnotes.length > 0) {
    result.footnotes = ctx.footnotes;
  }

  if (ctx.codeBlocks.length > 0) {
    result["code-blocks"] = ctx.codeBlocks;
  }

  if (ctx.htmlBlocks.length > 0) {
    result["html-blocks"] = ctx.htmlBlocks;
  }

  return result;
}
