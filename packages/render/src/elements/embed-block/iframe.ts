import type { Element } from "domhandler";
import { parseDocument } from "htmlparser2";

export function findIframes(html: string): Element[] {
  const doc = parseDocument(html);
  const iframes: Element[] = [];
  function walk(nodes: typeof doc.children): void {
    for (const node of nodes) {
      if (node.type !== "tag") {
        continue;
      }
      if (node.name === "iframe") {
        iframes.push(node);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }
  walk(doc.children);
  return iframes;
}

export function parseIframeUrl(src: string, baseUrl?: string): URL | null {
  try {
    if (src.startsWith("//")) {
      return new URL(src, baseUrl ?? "https://localhost");
    }
    return new URL(src);
  } catch {
    return null;
  }
}
