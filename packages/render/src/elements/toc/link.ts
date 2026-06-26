import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export interface TocLink {
  href: string;
  text: string;
}

export function extractTocLink(element: Element): TocLink | null {
  if (element.element !== "link") return null;

  const label = element.data.label;
  let text = "";
  if (typeof label === "object" && label !== null && "text" in label) {
    text = label.text;
  }

  const href = typeof element.data.link === "string" ? element.data.link : "";
  return { href, text };
}

export function rewriteTocAnchor(ctx: RenderContext, href: string): string {
  const match = /^#toc(\d+)$/.exec(href);
  if (!match) return href;
  return `#${ctx.generateId("toc", Number(match[1]))}`;
}
