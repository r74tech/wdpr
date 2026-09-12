import { renderButton } from "../elements/button";
import type { Element } from "@wdprlib/ast";
import { RenderContext } from "../context";
import { renderBibliographyBlock, renderBibliographyCite } from "../elements/bibliography";
import { renderClearFloat } from "../elements/clear-float";
import { renderCode } from "../elements/code";
import { renderCollapsible } from "../elements/collapsible";
import { renderContainer } from "../elements/container";
import { renderColor } from "../elements/color";
import { renderDate } from "../elements/date";
import { renderEmbed } from "../elements/embed";
import { renderEmbedBlock } from "../elements/embed-block";
import { renderExpr, renderIf, renderIfExpr } from "../elements/expr";
import { renderFootnoteBlock, renderFootnoteRef } from "../elements/footnote";
import { renderHtmlBlock } from "../elements/html";
import { renderIframe } from "../elements/iframe";
import { renderIfTags } from "../elements/iftags";
import { renderGallery } from "../elements/gallery";
import { renderImage } from "../elements/image";
import { renderInclude } from "../elements/include";
import { renderLineBreaks } from "../elements/line-break";
import { renderAnchor, renderAnchorName, renderLink } from "../elements/link";
import { renderDefinitionList, renderList } from "../elements/list";
import { renderMath, renderMathInline, renderEquationRef } from "../elements/math";
import { renderModule } from "../elements/module/index";
import { renderTable } from "../elements/table";
import { renderTabView } from "../elements/tab-view";
import { renderRaw, renderEmail, renderText } from "../elements/text";
import { renderTableOfContents } from "../elements/toc";
import { renderPager } from "../elements/pager";
import { renderUser } from "../elements/user";
import {
  renderContentSeparator,
  renderHorizontalRule,
  renderLineBreak,
  renderTextNode,
} from "./primitives";
import { renderStyleElement } from "./style";

/**
 * Render a list of sibling AST elements in document order.
 */
export function renderElements(ctx: RenderContext, elements: Element[]): void {
  for (const element of elements) {
    renderElement(ctx, element);
  }
}

/**
 * Dispatch a single AST element to its type-specific renderer.
 */
export function renderElement(ctx: RenderContext, element: Element): void {
  switch (element.element) {
    case "text":
      renderTextNode(ctx, element.data);
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
    case "gallery":
      renderGallery(ctx, element.data);
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
    case "pager":
      renderPager(ctx, element.data);
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
    case "button":
      renderButton(ctx, element.data);
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
      renderStyleElement(ctx, element.data);
      break;
    case "line-break":
      renderLineBreak(ctx);
      break;
    case "line-breaks":
      renderLineBreaks(ctx, element.data);
      break;
    case "clear-float":
      renderClearFloat(ctx, element.data);
      break;
    case "horizontal-rule":
      renderHorizontalRule(ctx);
      break;
    case "content-separator":
      renderContentSeparator(ctx);
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
