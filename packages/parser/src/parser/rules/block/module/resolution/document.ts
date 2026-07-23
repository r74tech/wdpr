import {
  evaluateExpression,
  isTruthy,
  type Diagnostic,
  type Element,
  type ParseResult,
  type SyntaxTree,
  type TocEntry,
} from "@wdprlib/ast";
import { extractHeadingText } from "../../heading/toc-text";
import { buildTableOfContents } from "../../../../toc";
import { resolveIfTags } from "../iftags/resolve";
import {
  getGenericElementChildren,
  listElement,
  withGenericElementChildren,
} from "../walk/children";
import type { ModuleParseResult } from "../types";

interface RegisterOptions {
  stripLegacyImplicitFootnoteBlock?: boolean;
}

/** Tracks parse-local side channels while module fragments are merged. */
export class ModuleDocumentRegistry {
  private readonly footnotesByElement = new WeakMap<Element, Element[]>();
  readonly diagnostics: Diagnostic[] = [];

  register(result: ModuleParseResult, options: RegisterOptions = {}): SyntaxTree {
    const parseResult = isParseResult(result) ? result : null;
    const ast: SyntaxTree = parseResult ? parseResult.ast : (result as SyntaxTree);
    const elements = options.stripLegacyImplicitFootnoteBlock
      ? stripTrailingDefaultFootnoteBlock(ast.elements)
      : ast.elements;
    const registeredAst = elements === ast.elements ? ast : { ...ast, elements };

    if (parseResult) {
      this.diagnostics.push(...parseResult.diagnostics);
    }
    this.registerFootnotes(registeredAst);
    return registeredAst;
  }

  finalize(
    ast: SyntaxTree,
    elements: Element[],
    pageTags: string[] | null,
    ensureFootnoteBlock = true,
  ): SyntaxTree {
    const normalizedElements = normalizeFootnoteBlocks(elements, ensureFootnoteBlock);
    const footnotes: Element[][] = [];
    const htmlBlocks: string[] = [];
    const codeBlocks: NonNullable<SyntaxTree["code-blocks"]> = [];
    const tocEntries: TocEntry[] = [];

    const collectElement = (element: Element): void => {
      if (element.element === "footnote") {
        const content = this.footnotesByElement.get(element);
        if (content) footnotes.push(content);
      } else if (element.element === "html") {
        htmlBlocks.push(element.data.contents);
      } else if (element.element === "code") {
        codeBlocks.push(element.data);
      } else if (isTocHeading(element)) {
        tocEntries.push({
          level: element.data.type.header.level,
          text: extractHeadingText(element.data.elements),
        });
      }
    };
    walkRenderOrder(normalizedElements, pageTags, collectElement);

    const result: SyntaxTree = { ...ast, elements: normalizedElements };
    setOptionalArray(result, "footnotes", footnotes);
    setOptionalArray(result, "html-blocks", htmlBlocks);
    setOptionalArray(result, "code-blocks", codeBlocks);
    setOptionalArray(result, "table-of-contents", buildTableOfContents(tocEntries));
    return result;
  }

  private registerFootnotes(ast: SyntaxTree): void {
    const footnoteElements: Element[] = [];
    walkSyntaxOrder(ast.elements, (element) => {
      if (element.element === "footnote") footnoteElements.push(element);
    });

    for (let i = 0; i < footnoteElements.length; i++) {
      const content = ast.footnotes?.[i];
      if (content) this.footnotesByElement.set(footnoteElements[i]!, content);
    }
  }
}

function isParseResult(result: ModuleParseResult): result is ParseResult {
  return "ast" in result && "diagnostics" in result;
}

function setOptionalArray<K extends keyof SyntaxTree>(
  tree: SyntaxTree,
  key: K,
  value: NonNullable<SyntaxTree[K]>,
): void {
  if ((value as unknown[]).length > 0) {
    tree[key] = value;
  } else {
    delete tree[key];
  }
}

function stripTrailingDefaultFootnoteBlock(elements: Element[]): Element[] {
  const last = elements.at(-1);
  if (last?.element !== "footnote-block" || last.data.title !== null || last.data.hide === true) {
    return elements;
  }
  return elements.slice(0, -1);
}

function normalizeFootnoteBlocks(elements: Element[], ensureFootnoteBlock: boolean): Element[] {
  const state = { found: false };
  const normalized = mapSyntaxElements(elements, (element) => {
    if (element.element !== "footnote-block") return element;
    if (state.found) return null;
    state.found = true;
    return element;
  });

  if (!state.found && ensureFootnoteBlock) {
    normalized.push({
      element: "footnote-block",
      data: { title: null, hide: false },
    });
  }
  return normalized;
}

export function containsSyntaxFootnoteBlock(elements: Element[]): boolean {
  let found = false;
  walkSyntaxOrder(elements, (element) => {
    if (element.element === "footnote-block") found = true;
  });
  return found;
}

function mapSyntaxElements(
  elements: Element[],
  transform: (element: Element) => Element | null,
): Element[] {
  const result: Element[] = [];
  for (const original of elements) {
    const element = transform(original);
    if (!element) continue;
    result.push(mapSyntaxChildren(element, (children) => mapSyntaxElements(children, transform)));
  }
  return result;
}

function mapSyntaxChildren(
  element: Element,
  transform: (elements: Element[]) => Element[],
): Element {
  if (element.element === "if") {
    return {
      ...element,
      data: {
        ...element.data,
        // oxlint-disable-next-line unicorn/no-thenable -- `then` is part of the public AST schema
        then: transform(element.data.then),
        else: transform(element.data.else),
      },
    };
  }
  if (element.element === "ifexpr") {
    return {
      ...element,
      data: {
        ...element.data,
        // oxlint-disable-next-line unicorn/no-thenable -- `then` is part of the public AST schema
        then: transform(element.data.then),
        else: transform(element.data.else),
      },
    };
  }
  if (element.element === "bibliography-block") {
    return {
      ...element,
      data: {
        ...element.data,
        entries: element.data.entries.map((entry) => ({
          ...entry,
          key: transform(entry.key),
          value: transform(entry.value),
        })),
      },
    };
  }
  if (element.element === "list") {
    return {
      ...element,
      data: {
        ...element.data,
        items: element.data.items.map((item) =>
          item["item-type"] === "elements"
            ? { ...item, elements: transform(item.elements) }
            : mapSubList(item, transform),
        ),
      },
    };
  }
  if (element.element === "table") {
    return {
      ...element,
      data: {
        ...element.data,
        rows: element.data.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({ ...cell, elements: transform(cell.elements) })),
        })),
      },
    };
  }
  if (element.element === "definition-list") {
    return {
      ...element,
      data: element.data.map((entry) => ({
        ...entry,
        key: transform(entry.key),
        value: transform(entry.value),
      })),
    };
  }
  if (element.element === "tab-view") {
    return {
      ...element,
      data: element.data.map((tab) => ({ ...tab, elements: transform(tab.elements) })),
    };
  }

  const children = getGenericElementChildren(element);
  return children === null ? element : withGenericElementChildren(element, transform(children));
}

function mapSubList(
  item: Extract<ElementOfListItem, { "item-type": "sub-list" }>,
  transform: (elements: Element[]) => Element[],
): ElementOfListItem {
  const transformed = transform([listElement(item.data)])[0];
  return transformed?.element === "list" ? { ...item, data: transformed.data } : item;
}

type ElementOfListItem = Extract<Element, { element: "list" }>["data"]["items"][number];

function walkSyntaxOrder(elements: Element[], callback: (element: Element) => void): void {
  for (const element of elements) {
    callback(element);
    walkAllSyntaxChildren(element, (children) => walkSyntaxOrder(children, callback));
  }
}

function walkRenderOrder(
  elements: Element[],
  pageTags: string[] | null,
  callback: (element: Element) => void,
): void {
  for (const element of elements) {
    callback(element);
    if (element.element === "if") {
      walkRenderOrder(
        isTruthy(element.data.condition) ? element.data.then : element.data.else,
        pageTags,
        callback,
      );
      continue;
    }
    if (element.element === "ifexpr") {
      const evaluated = evaluateExpression(element.data.expression);
      if (evaluated.success) {
        walkRenderOrder(
          evaluated.value !== 0 ? element.data.then : element.data.else,
          pageTags,
          callback,
        );
      }
      continue;
    }
    if (element.element === "if-tags") {
      const resolved = resolveIfTags(element.data, pageTags);
      if (!resolved.evaluated || resolved.matched) {
        walkRenderOrder(element.data.elements, pageTags, callback);
      }
      continue;
    }
    if (element.element === "bibliography-block") {
      if (!element.data.hide) {
        for (const entry of element.data.entries) {
          walkRenderOrder(entry.value, pageTags, callback);
        }
      }
      continue;
    }
    walkBasicChildren(element, (children) => walkRenderOrder(children, pageTags, callback));
  }
}

function walkAllSyntaxChildren(element: Element, callback: (elements: Element[]) => void): void {
  if (element.element === "if" || element.element === "ifexpr") {
    callback(element.data.then);
    callback(element.data.else);
    return;
  }
  if (element.element === "bibliography-block") {
    for (const entry of element.data.entries) {
      callback(entry.key);
      callback(entry.value);
    }
    return;
  }
  walkBasicChildren(element, callback);
}

function walkBasicChildren(element: Element, callback: (elements: Element[]) => void): void {
  if (element.element === "list") {
    for (const item of element.data.items) {
      callback(item["item-type"] === "elements" ? item.elements : [listElement(item.data)]);
    }
    return;
  }
  if (element.element === "table") {
    for (const row of element.data.rows) {
      for (const cell of row.cells) callback(cell.elements);
    }
    return;
  }
  if (element.element === "definition-list") {
    for (const entry of element.data) {
      callback(entry.key);
      callback(entry.value);
    }
    return;
  }
  if (element.element === "tab-view") {
    for (const tab of element.data) callback(tab.elements);
    return;
  }
  const children = getGenericElementChildren(element);
  if (children !== null) callback(children);
}

function isTocHeading(element: Element): element is Extract<Element, { element: "container" }> & {
  data: { type: { header: { level: number; "has-toc": true } } };
} {
  return (
    element.element === "container" &&
    typeof element.data.type === "object" &&
    "header" in element.data.type &&
    element.data.type.header["has-toc"]
  );
}
