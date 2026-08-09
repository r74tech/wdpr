import type { HtmlData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, sanitizeStyleValue } from "../../escape";

export interface HtmlBlockAttributes {
  sandbox: string;
  style: string;
}

export function getHtmlBlockAttributes(ctx: RenderContext, data: HtmlData): HtmlBlockAttributes {
  return {
    sandbox: getSandboxAttribute(ctx),
    style: getStyleAttribute(data),
  };
}

function getSandboxAttribute(ctx: RenderContext): string {
  const sandbox = ctx.options.htmlBlockSandbox;
  return sandbox === null ? "" : ` sandbox="${escapeAttr(sandbox ?? "")}"`;
}

function getStyleAttribute(data: HtmlData): string {
  return data.style ? ` style="${escapeAttr(sanitizeStyleValue(data.style))}"` : "";
}
