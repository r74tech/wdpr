import type { SyntaxTree } from "@wdprlib/ast";
import type { SerializeOptions } from "../types";
import { SerializeContext } from "./context";
import { serializeElements, setCurrentTree } from "./serialize-element";

/**
 * Serialize a Wikidot AST ({@link SyntaxTree}) into Wikidot markup text.
 *
 * Trailing blank lines are collapsed, and the output always ends with
 * a single newline.
 *
 * @param tree - The syntax tree to serialize
 * @param options - Serialization options (e.g. newline style)
 * @returns Wikidot markup string
 */
export function serialize(tree: SyntaxTree, options?: SerializeOptions): string {
  const ctx = new SerializeContext(options);
  setCurrentTree(tree);
  serializeElements(ctx, tree.elements, /* topLevel */ true);

  let output = ctx.getOutput();
  // Collapse runs of 3+ newlines down to 2 (one blank line)
  const nl = ctx.newline;
  const nlEsc = nl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  output = output.replace(new RegExp(`(${nlEsc}){3,}`, "g"), nl + nl);
  output = output.replace(new RegExp(`(${nlEsc})+$`), nl);
  return output;
}
