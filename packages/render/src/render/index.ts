import type { SyntaxTree } from "@wdprlib/ast";
import { RenderContext } from "../context";
import type { RenderOptions } from "../types";
import { renderCollectedStyles } from "./collected-styles";
import { renderElements } from "./dispatch";

export { renderElement, renderElements } from "./dispatch";

/**
 * Render a {@link SyntaxTree} to an HTML string.
 *
 * This is the main entry point of `@wdprlib/render`. It walks the AST
 * produced by `@wdprlib/parser`, serialises each element to HTML, and
 * appends any collected `[[module CSS]]` styles at the end (when
 * `WikitextSettings.allowStyleElements` is `true`).
 *
 * @param tree - Parsed AST (from `parse()` or `resolveModules()`)
 * @param options - Rendering configuration
 * @returns Complete HTML string
 *
 * @group Render
 */
export function renderToHtml(tree: SyntaxTree, options: RenderOptions = {}): string {
  const ctx = new RenderContext(tree, options);
  renderElements(ctx, tree.elements);
  renderCollectedStyles(ctx, tree.styles);
  return ctx.getOutput();
}

export function renderToHtmlWithStyles(
  tree: SyntaxTree,
  options: RenderOptions,
  emitStyleTags: boolean,
): { html: string; styles: string[] } {
  const styles: string[] = [];
  const ctx = new RenderContext(tree, options, { collectedStyles: styles, emitStyleTags });
  renderElements(ctx, tree.elements);
  renderCollectedStyles(ctx, tree.styles);
  return { html: ctx.getOutput(), styles };
}
