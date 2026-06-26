import type { IframeData } from "@wdprlib/ast";
import { escapeAttr, isDangerousUrl, sanitizeStyleValue } from "../../escape";

const IFRAME_ATTRIBUTES = ["align", "frameborder", "height", "scrolling", "width", "class", "style"];

export function getIframeAttributes(data: IframeData): string[] {
  const url = isDangerousUrl(data.url) ? "#invalid-url" : data.url;
  const attrs = [`src="${escapeAttr(url)}"`];

  for (const attr of IFRAME_ATTRIBUTES) {
    attrs.push(`${attr}="${escapeAttr(getIframeAttributeValue(data, attr))}"`);
  }

  return attrs;
}

function getIframeAttributeValue(data: IframeData, attr: string): string {
  const value = data.attributes[attr] ?? "";
  return attr === "style" ? sanitizeStyleValue(value) : value;
}
