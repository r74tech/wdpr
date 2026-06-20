import type { Element, ParseResult } from "@wdprlib/ast";

const LARGE_PLAIN_TEXT_MIN_LENGTH = 100_000;

export function parsePlainNonAsciiDocument(source: string): ParseResult | null {
  if (!isPlainNonAsciiDocument(source)) {
    return null;
  }

  const text = trimNewlineEdges(source);
  const elements = text === "" ? [] : buildPlainParagraphs(text);

  elements.push({
    element: "footnote-block",
    data: { title: null, hide: false },
  });

  return { ast: { elements }, diagnostics: [] };
}

function isPlainNonAsciiDocument(source: string): boolean {
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if ((code >= 0x00 && code <= 0x09) || (code >= 0x0b && code <= 0x7f) || code === 0xe000) {
      return false;
    }
  }

  return true;
}

export function parseLargePlainTextDocument(source: string): ParseResult | null {
  if (source.length < LARGE_PLAIN_TEXT_MIN_LENGTH || hasWikitextSyntaxCandidate(source)) {
    return null;
  }

  const text = trimNewlineEdges(source);
  const elements = text === "" ? [] : buildPlainParagraphs(text);

  elements.push({
    element: "footnote-block",
    data: { title: null, hide: false },
  });

  return { ast: { elements }, diagnostics: [] };
}

function hasWikitextSyntaxCandidate(source: string): boolean {
  for (let i = 0; i < source.length; i++) {
    switch (source.charCodeAt(i)) {
      case 42: // *
      case 43: // +
      case 47: // /
      case 60: // <
      case 61: // =
      case 62: // >
      case 64: // @
      case 91: // [
      case 92: // \
      case 93: // ]
      case 94: // ^
      case 95: // _
      case 124: // |
      case 126: // ~
      case 0xe000:
        return true;
      case 35: // #
        if (isLineStart(source, i)) return true;
        break;
      case 45: // -
        if (source.charCodeAt(i + 1) === 45) return true;
        break;
      case 44: // ,
        if (source.charCodeAt(i + 1) === 44) return true;
        break;
      case 123: // {
        if (source.charCodeAt(i + 1) === 123) return true;
        break;
      case 125: // }
        if (source.charCodeAt(i + 1) === 125) return true;
        break;
    }
  }

  return false;
}

function isLineStart(source: string, index: number): boolean {
  if (index === 0) return true;
  const prev = source.charCodeAt(index - 1);
  return prev === 10 || prev === 13;
}

function trimNewlineEdges(source: string): string {
  let start = 0;
  let end = source.length;
  while (start < end && source.charCodeAt(start) === 10) start++;
  while (end > start && source.charCodeAt(end - 1) === 10) end--;
  return start === 0 && end === source.length ? source : source.slice(start, end);
}

function buildPlainParagraphs(text: string): Element[] {
  const paragraphs =
    text.indexOf("\n\n") === -1 ? [text] : text.split(/\n{2,}/).filter((part) => part !== "");

  return paragraphs.map((paragraphText) => ({
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements: buildPlainParagraphElements(paragraphText),
    },
  }));
}

function buildPlainParagraphElements(text: string): Element[] {
  const lines = text.split("\n");
  const elements: Element[] = Array.from({ length: lines.length * 2 - 1 });
  let out = 0;

  for (let i = 0; i < lines.length; i++) {
    elements[out++] = { element: "text", data: lines[i]! };
    if (i !== lines.length - 1) {
      elements[out++] = { element: "line-break" };
    }
  }

  return elements;
}
