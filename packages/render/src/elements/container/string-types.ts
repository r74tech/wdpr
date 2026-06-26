type StringContainerRendering =
  | { kind: "wrapped"; tag: string }
  | { kind: "styled-span"; style: string }
  | { kind: "plain-wrapped"; tag: string }
  | { kind: "contents" };

const WRAPPED_TAGS: Readonly<Record<string, string>> = {
  paragraph: "p",
  bold: "strong",
  italics: "em",
  superscript: "sup",
  subscript: "sub",
  monospace: "tt",
  span: "span",
  div: "div",
  blockquote: "blockquote",
  mark: "mark",
  insertion: "ins",
  deletion: "del",
  size: "span",
  ruby: "ruby",
  "ruby-text": "rt",
  "table-row": "tr",
  "table-cell": "td",
};

const STYLED_SPANS: Readonly<Record<string, string>> = {
  underline: "text-decoration: underline;",
  strikethrough: "text-decoration: line-through;",
  hidden: "display: none",
  invisible: "visibility: hidden",
};

const PLAIN_WRAPPED_TAGS: Readonly<Record<string, string>> = {
  "definition-list": "dl",
  "definition-list-key": "dt",
  "definition-list-value": "dd",
};

const CONTENTS_ONLY_TYPES = new Set(["heading", "collapsible", "definition-list-item"]);

export function getStringContainerRendering(type: string): StringContainerRendering {
  const wrappedTag = WRAPPED_TAGS[type];
  if (wrappedTag) {
    return { kind: "wrapped", tag: wrappedTag };
  }

  const style = STYLED_SPANS[type];
  if (style) {
    return { kind: "styled-span", style };
  }

  const plainTag = PLAIN_WRAPPED_TAGS[type];
  if (plainTag) {
    return { kind: "plain-wrapped", tag: plainTag };
  }

  return { kind: "contents" };
}

export function isContentsOnlyStringContainer(type: string): boolean {
  return CONTENTS_ONLY_TYPES.has(type);
}
