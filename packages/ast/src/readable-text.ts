import type { Element, SyntaxTree } from "./element";
import { evaluateExpression, formatExprValue, isTruthy } from "./expr-eval";

export interface ReadableTextOptions {
  /** Exclude a subtree, for example an ACS/license container identified by the host. */
  exclude?: (element: Element) => boolean;
  /** Match host-rendered labels or supply text for date/math leaves. Undefined uses the default. */
  resolveText?: (
    element: Extract<Element, { element: "link" | "user" | "date" | "math" | "math-inline" }>,
  ) => string | undefined;
}

const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

/** Count graphemes, including whitespace, in the supplied readable text. */
export function countCharacters(text: string): number {
  let count = 0;
  for (const _segment of segmenter.segment(text)) count++;
  return count;
}

/**
 * Extract semantic text from a resolved document, without executing HTML, CSS or JS.
 * Paragraph boundaries become blank lines; other whitespace is normalized. Tabs and
 * collapsibles include all panels. Footnotes are appended once, without reference UI.
 * Math/date leaves require resolveText; source TeX and timestamps are not prose.
 */
export function extractReadableText(ast: SyntaxTree, options: ReadableTextOptions = {}): string {
  return extractText(ast, options, false);
}

/** Extract the first nonempty paragraph, excluding headings and appended footnotes. */
export function extractFirstParagraph(ast: SyntaxTree, options: ReadableTextOptions = {}): string {
  return extractText(ast, options, true);
}

function extractText(
  ast: SyntaxTree,
  options: ReadableTextOptions,
  firstParagraphOnly: boolean,
): string {
  const parts: string[] = [];
  const notes = new Set<number>();
  let footnoteIndex = 0;
  let firstParagraph: string | undefined;
  const emit = (value: string, omit: boolean) => {
    if (!omit) parts.push(value);
  };
  const block = (elements: Element[], omit: boolean) => {
    emit("\n\n", omit);
    visit(elements, omit);
    emit("\n\n", omit);
  };
  const visitBranch = (elements: Element[], omit: boolean) => {
    const end =
      elements.findLastIndex(
        (element) => element.element !== "text" || element.data.trim() !== "",
      ) + 1;
    visit(elements.slice(0, end), omit);
  };
  const visit = (elements: Element[], inheritedOmit = false): void => {
    for (const element of elements) {
      if (firstParagraphOnly && firstParagraph !== undefined) return;
      const omit = inheritedOmit || options.exclude?.(element) === true;
      switch (element.element) {
        case "text":
        case "raw":
        case "email":
          emit(element.data, omit);
          break;
        case "container": {
          const start = parts.length;
          const type = element.data.type;
          const kind: string = typeof type === "string" ? type : "block";
          const hidden = omit || ["ruby-text", "hidden", "invisible"].includes(kind);
          if (
            [
              "paragraph",
              "div",
              "blockquote",
              "note",
              "heading",
              "block",
              "table-row",
              "definition-list",
            ].includes(kind)
          )
            block(element.data.elements, hidden);
          else visit(element.data.elements, hidden);
          if (firstParagraphOnly && kind === "paragraph" && firstParagraph === undefined) {
            const text = normalizeText(parts.slice(start).join(""));
            if (text) firstParagraph = text;
          }
          break;
        }
        case "color":
        case "anchor":
        case "include":
          visit(element.data.elements, omit);
          break;
        case "collapsible":
          block(element.data.elements, omit);
          break;
        case "tab-view":
          for (const tab of element.data) {
            emit(`\n\n${tab.label}\n`, omit);
            block(tab.elements, omit);
          }
          break;
        case "table":
          emit("\n\n", omit);
          for (const row of element.data.rows) {
            for (const cell of row.cells) {
              visit(cell.elements, omit);
              emit(" ", omit);
            }
            emit("\n", omit);
          }
          emit("\n", omit);
          break;
        case "definition-list":
          for (const entry of element.data) {
            block(entry.key, omit);
            visit(entry.value, omit);
          }
          break;
        case "list":
          for (const item of element.data.items) {
            emit("\n", omit);
            if (item["item-type"] === "elements") visit(item.elements, omit);
            else visit([{ element: "list", data: item.data }], omit);
          }
          emit("\n", omit);
          break;
        case "link": {
          const label = element.data.label;
          const destination =
            typeof element.data.link === "string" ? element.data.link : element.data.link.page;
          const fallback =
            label === "page"
              ? destination
              : "text" in label
                ? label.text
                : (label.url ?? destination);
          emit(options.resolveText?.(element) ?? fallback, omit);
          break;
        }
        case "user":
          emit(options.resolveText?.(element) ?? element.data.name, omit);
          break;
        case "date":
        case "math":
        case "math-inline":
          emit(options.resolveText?.(element) ?? "", omit);
          break;
        case "image":
          emit(element.data.attributes.alt ?? "", omit);
          break;
        case "gallery":
          if (element.data.content.type === "items")
            for (const item of element.data.content.items) emit(`${item.alt ?? ""}\n`, omit);
          break;
        case "code":
          emit(`\n\n${element.data.contents}\n\n`, omit);
          break;
        case "footnote":
        case "footnote-ref": {
          const index = element.element === "footnote" ? footnoteIndex++ : element.data - 1;
          if (!omit) notes.add(index);
          break;
        }
        case "bibliography-block":
          for (const entry of element.data.entries) block(entry.value, omit);
          break;
        case "if":
          visitBranch(
            isTruthy(element.data.condition) ? element.data.then : element.data.else,
            omit,
          );
          break;
        case "ifexpr": {
          const result = evaluateExpression(element.data.expression);
          if (result.success)
            visitBranch(result.value !== 0 ? element.data.then : element.data.else, omit);
          break;
        }
        case "expr": {
          const result = evaluateExpression(element.data.expression);
          if (result.success) emit(formatExprValue(result.value), omit);
          break;
        }
        case "line-break":
        case "line-breaks":
          emit("\n", omit);
          break;
        case "horizontal-rule":
        case "content-separator":
          emit("\n\n", omit);
          break;
        default:
          break;
      }
    }
  };
  visit(ast.elements);
  if (firstParagraphOnly) return firstParagraph ?? "";
  for (const index of notes) {
    const note = ast.footnotes?.[index];
    if (note) block(note, false);
  }
  return normalizeText(parts.join(""));
}

function normalizeText(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
