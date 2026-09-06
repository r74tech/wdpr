import type { SyntaxTree } from "@wdprlib/ast";
import type { DecompileOptions } from "./types";
import { htmlToAst } from "./html2ast/index";
import { serialize } from "./serializer/index";

export type { DecompileOptions, SerializeOptions } from "./types";
export { htmlToAst } from "./html2ast/index";
export { serialize } from "./serializer/index";
export { buildInfo } from "./build-info.generated";

/**
 * Decompile HTML into Wikidot syntax.
 *
 * Combines {@link htmlToAst} and {@link serialize} into a single call:
 * HTML → AST → Wikidot markup.
 *
 * @param html - The HTML string to decompile
 * @param options - Decompilation options
 * @returns Wikidot syntax string
 */
export function decompile(html: string, options?: DecompileOptions): string {
  const tree: SyntaxTree = htmlToAst(html, options);
  return serialize(tree);
}
