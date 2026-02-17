import type { SyntaxTree, Element } from "@wdprlib/ast";
import { parseDocument } from "htmlparser2";
import type { DecompileOptions } from "../types";
import { DecompileContext } from "./context";
import { recognizeNode } from "./recognizer";

/**
 * Convert an HTML string into a Wikidot AST ({@link SyntaxTree}).
 *
 * The returned tree includes a `footnotes` array when footnote content is
 * detected in the HTML.
 *
 * @param html - The HTML string to parse
 * @param options - Decompilation options
 * @returns The resulting syntax tree
 */
export function htmlToAst(html: string, options?: DecompileOptions): SyntaxTree {
  const document = parseDocument(html, { decodeEntities: true });
  const ctx = new DecompileContext(options);

  const elements = document.childNodes.flatMap((node) => recognizeNode(node, ctx));

  const tree: SyntaxTree = { elements };

  if (ctx.footnoteContents.size > 0) {
    const footnotes: Element[][] = [];
    for (const [index, content] of ctx.footnoteContents) {
      footnotes[index - 1] = content;
    }
    tree.footnotes = footnotes;
  }

  return tree;
}
