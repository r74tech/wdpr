import type { Element, SyntaxTree } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import {
  serializeText,
  serializeRaw,
  serializeLineBreak,
  serializeHorizontalRule,
  serializeContentSeparator,
  serializeEmail,
} from "./text";
import { serializeContainer } from "./container";
import { serializeLink, serializeAnchorName } from "./link";
import { serializeImage } from "./image";
import { serializeList, serializeDefinitionList } from "./list";
import { serializeTable } from "./table";
import { serializeCode } from "./code";
import { serializeCollapsible } from "./collapsible";
import { serializeGallery } from "./gallery";
import { serializeTabView } from "./tab-view";
import { serializeFootnoteInline, serializeFootnoteRef, serializeFootnoteBlock } from "./footnote";
import { serializeMath, serializeMathInline } from "./math";
import {
  serializeColor,
  serializeClearFloat,
  serializeEmbed,
  serializeEmbedBlock,
  serializeIframe,
  serializeStyle,
  serializeAnchor,
  serializeBibliographyCite,
  serializeBibliographyBlock,
  serializeEquationRef,
} from "./misc";

let currentTree: SyntaxTree | undefined;
let footnoteCounter = 0;

/**
 * Set the current syntax tree for footnote content lookup.
 *
 * Must be called before {@link serializeElements} so that footnote elements
 * can retrieve their content from `tree.footnotes`.
 */
export function setCurrentTree(tree: SyntaxTree): void {
  currentTree = tree;
  footnoteCounter = 0;
}

/**
 * Serialize a single AST element to Wikidot markup.
 *
 * Dispatches to the appropriate serializer based on `element.element`.
 */
export function serializeElement(ctx: SerializeContext, element: Element): void {
  switch (element.element) {
    case "text":
      serializeText(ctx, element.data);
      break;
    case "raw":
      serializeRaw(ctx, element.data);
      break;
    case "email":
      serializeEmail(ctx, element.data);
      break;
    case "container":
      serializeContainer(ctx, element.data);
      break;
    case "line-break":
      serializeLineBreak(ctx);
      break;
    case "horizontal-rule":
      serializeHorizontalRule(ctx);
      break;
    case "content-separator":
      serializeContentSeparator(ctx);
      break;
    case "link":
      serializeLink(ctx, element.data);
      break;
    case "anchor":
      serializeAnchor(ctx, element.data);
      break;
    case "anchor-name":
      serializeAnchorName(ctx, element.data);
      break;
    case "image":
      serializeImage(ctx, element.data);
      break;
    case "gallery":
      serializeGallery(ctx, element.data);
      break;
    case "list":
      serializeList(ctx, element.data);
      break;
    case "definition-list":
      serializeDefinitionList(ctx, element.data);
      break;
    case "table":
      serializeTable(ctx, element.data);
      break;
    case "code":
      serializeCode(ctx, element.data);
      break;
    case "collapsible":
      serializeCollapsible(ctx, element.data);
      break;
    case "tab-view":
      serializeTabView(ctx, element.data);
      break;
    case "footnote":
      serializeFootnoteInline(ctx, footnoteCounter, currentTree?.footnotes);
      footnoteCounter++;
      break;
    case "footnote-ref":
      serializeFootnoteRef(ctx, element.data, currentTree?.footnotes);
      break;
    case "footnote-block": {
      const isLast = (element as Record<string, unknown>)._isLastElement as boolean | undefined;
      serializeFootnoteBlock(ctx, element.data, isLast);
      break;
    }
    case "math":
      serializeMath(ctx, element.data);
      break;
    case "math-inline":
      serializeMathInline(ctx, element.data);
      break;
    case "equation-reference":
      serializeEquationRef(ctx, element.data);
      break;
    case "color":
      serializeColor(ctx, element.data);
      break;
    case "clear-float":
      serializeClearFloat(ctx, element.data);
      break;
    case "embed":
      serializeEmbed(ctx, element.data);
      break;
    case "embed-block":
      serializeEmbedBlock(ctx, element.data);
      break;
    case "iframe":
      serializeIframe(ctx, element.data);
      break;
    case "style":
      serializeStyle(ctx, element.data);
      break;
    case "bibliography-cite":
      serializeBibliographyCite(ctx, element.data);
      break;
    case "bibliography-block":
      serializeBibliographyBlock(ctx, element.data);
      break;
    default:
      break;
  }
}

/**
 * Serialize an array of AST elements in order.
 *
 * `topLevel` controls whether the trailing implicit-default footnote
 * block is allowed to be suppressed. The top-level `serialize()` entry
 * point passes `true` (default suppression matches the parser's
 * auto-append). Every nested caller — collapsible bodies, list items,
 * table cells, tab panels, definition-list entries, etc. — defaults to
 * `false` so that an explicit `[[footnoteblock]]` inside a container is
 * always preserved on serialization; otherwise it would round-trip into
 * a silent removal.
 */
export function serializeElements(
  ctx: SerializeContext,
  elements: Element[],
  topLevel = false,
): void {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    // Tag the last footnote-block so it can be omitted if implicit
    if (topLevel && el.element === "footnote-block" && i === elements.length - 1) {
      (el as Record<string, unknown>)._isLastElement = true;
    }
    serializeElement(ctx, el);
  }
}
