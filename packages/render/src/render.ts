import type { Element, SyntaxTree } from "@wdprlib/ast";
import { RenderContext } from "./context";
import { escapeStyleContent } from "./escape";
import type { RenderOptions } from "./types";
import { renderContainer } from "./elements/container";
import { renderText, renderRaw, renderEmail } from "./elements/text";
import { renderLink, renderAnchor, renderAnchorName } from "./elements/link";
import { renderImage } from "./elements/image";
import { renderList, renderDefinitionList } from "./elements/list";
import { renderTable } from "./elements/table";
import { renderCollapsible } from "./elements/collapsible";
import { renderCode } from "./elements/code";
import { renderTabView } from "./elements/tab-view";
import { renderFootnoteRef, renderFootnoteBlock } from "./elements/footnote";
import { renderMath, renderMathInline, renderEquationRef } from "./elements/math";
import { renderModule } from "./elements/module/index";
import { renderEmbed } from "./elements/embed";
import { renderEmbedBlock } from "./elements/embed-block";
import { renderUser } from "./elements/user";
import { renderBibliographyCite, renderBibliographyBlock } from "./elements/bibliography";
import { renderTableOfContents } from "./elements/toc";
import { renderLineBreaks } from "./elements/line-break";
import { renderClearFloat } from "./elements/clear-float";
import { renderIframe } from "./elements/iframe";
import { renderHtmlBlock } from "./elements/html";
import { renderInclude } from "./elements/include";
import { renderIfTags } from "./elements/iftags";
import { renderColor } from "./elements/color";
import { renderDate } from "./elements/date";
import { renderExpr, renderIf, renderIfExpr } from "./elements/expr";

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

  // Append styles (with tag breakout prevention)
  if (ctx.settings.allowStyleElements && tree.styles?.length) {
    for (const style of tree.styles) {
      ctx.push(`<style>${escapeStyleContent(style)}</style>`);
    }
  }

  return ctx.getOutput();
}

/**
 * Render a list of sibling AST elements in document order.
 *
 * Used internally by container renderers that need to emit their
 * children. Not exported from the package barrel — call
 * {@link renderToHtml} instead for top-level rendering.
 */
export function renderElements(ctx: RenderContext, elements: Element[]): void {
  for (const element of elements) {
    renderElement(ctx, element);
  }
}

/**
 * Dispatch a single AST element to its type-specific renderer.
 *
 * The switch covers every `ElementName` value defined by
 * `@wdprlib/ast`. Unknown element types are silently ignored.
 */
export function renderElement(ctx: RenderContext, element: Element): void {
  switch (element.element) {
    case "text":
      ctx.pushEscaped(element.data);
      break;
    case "raw":
      renderRaw(ctx, element.data);
      break;
    case "variable":
      renderText(ctx, element.data);
      break;
    case "email":
      renderEmail(ctx, element.data);
      break;
    case "container":
      renderContainer(ctx, element.data);
      break;
    case "link":
      renderLink(ctx, element.data);
      break;
    case "anchor":
      renderAnchor(ctx, element.data);
      break;
    case "anchor-name":
      renderAnchorName(ctx, element.data);
      break;
    case "image":
      renderImage(ctx, element.data);
      break;
    case "list":
      renderList(ctx, element.data);
      break;
    case "definition-list":
      renderDefinitionList(ctx, element.data);
      break;
    case "table":
      renderTable(ctx, element.data);
      break;
    case "collapsible":
      renderCollapsible(ctx, element.data);
      break;
    case "code":
      renderCode(ctx, element.data);
      break;
    case "tab-view":
      renderTabView(ctx, element.data);
      break;
    case "footnote":
      renderFootnoteRef(ctx, ctx.nextFootnoteIndex() + 1);
      break;
    case "footnote-ref":
      renderFootnoteRef(ctx, element.data);
      break;
    case "footnote-block":
      renderFootnoteBlock(ctx, element.data);
      break;
    case "bibliography-cite":
      renderBibliographyCite(ctx, element.data);
      break;
    case "bibliography-block":
      renderBibliographyBlock(ctx, element.data, renderElements);
      break;
    case "table-of-contents":
      renderTableOfContents(ctx, element.data);
      break;
    case "math":
      renderMath(ctx, element.data);
      break;
    case "math-inline":
      renderMathInline(ctx, element.data);
      break;
    case "module":
      renderModule(ctx, element.data);
      break;
    case "embed":
      renderEmbed(ctx, element.data);
      break;
    case "embed-block":
      renderEmbedBlock(ctx, element.data);
      break;
    case "user":
      renderUser(ctx, element.data);
      break;
    case "date":
      renderDate(ctx, element.data);
      break;
    case "color":
      renderColor(ctx, element.data);
      break;
    case "html":
      renderHtmlBlock(ctx, element.data);
      break;
    case "iframe":
      renderIframe(ctx, element.data);
      break;
    case "include":
      renderInclude(ctx, element.data);
      break;
    case "if-tags":
      renderIfTags(ctx, element.data);
      break;
    case "style":
      // Styles are collected into tree.styles during resolve and rendered
      // at the end of renderToHtml. Style elements remaining in the AST
      // (inside unresolved iftags) are rendered inline when the
      // renderInlineStyles flag is set by renderIfTags.
      if (ctx.renderInlineStyles && ctx.settings.allowStyleElements) {
        ctx.push(`<style>${escapeStyleContent(element.data)}</style>`);
      }
      break;
    case "line-break":
      ctx.push("<br />");
      break;
    case "line-breaks":
      renderLineBreaks(ctx, element.data);
      break;
    case "clear-float":
      renderClearFloat(ctx, element.data);
      break;
    case "horizontal-rule":
      ctx.push("<hr />");
      break;
    case "content-separator":
      ctx.push(`<div class="content-separator" style="display: none:"></div>`);
      break;
    case "expr":
      renderExpr(ctx, element.data);
      break;
    case "if":
      renderIf(ctx, element.data);
      break;
    case "ifexpr":
      renderIfExpr(ctx, element.data);
      break;
    case "equation-reference":
      renderEquationRef(ctx, element.data);
      break;
  }
}
