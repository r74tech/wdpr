import type { Element, CodeBlockData } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";

/**
 * Recognize a `<div class="code">` element as a code block AST element.
 *
 * Handles both plain code (`<pre><code>`) and syntax-highlighted code
 * (`<div class="hl-main"><pre>` with highlight spans).
 */
export function recognizeCodeBlock(node: DomElement): Element {
  const data = extractCodeBlockData(node);
  return { element: "code", data };
}

/**
 * Extract code block content from a code div.
 *
 * For syntax-highlighted code, highlight spans are stripped to recover
 * plain text. Language detection is not attempted (best-effort).
 */
function extractCodeBlockData(node: DomElement): CodeBlockData {
  // <div class="code"><div class="hl-main"><pre>...highlighted...</pre></div></div>
  // or <div class="code"><pre><code>...plain...</code></pre></div>

  const hlMain = findByClass(node, "hl-main");
  if (hlMain) {
    // Syntax-highlighted: strip hl-spans and extract plain text only
    const pre = findTag(hlMain, "pre");
    const contents = pre ? extractPlainText(pre) : "";
    return { contents, language: null, name: null };
  }

  const pre = findTag(node, "pre");
  if (pre) {
    const code = findTag(pre, "code");
    const contents = code ? extractPlainText(code) : extractPlainText(pre);
    return { contents, language: null, name: null };
  }

  return { contents: "", language: null, name: null };
}

/** Find a descendant element by class name (depth-first). */
function findByClass(node: DomElement, className: string): DomElement | null {
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    if ((child.attribs.class ?? "").includes(className)) return child;
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

/** Find a direct child element by tag name. */
function findTag(node: DomElement, tagName: string): DomElement | null {
  for (const child of node.childNodes) {
    if (isTag(child) && child.name === tagName) return child;
  }
  return null;
}

/** Recursively extract plain text from a DOM subtree, ignoring all tags. */
function extractPlainText(node: DomElement): string {
  let result = "";
  for (const child of node.childNodes) {
    if (child.type === "text") {
      result += child.data;
    } else if (isTag(child)) {
      result += extractPlainText(child);
    }
  }
  return result;
}
