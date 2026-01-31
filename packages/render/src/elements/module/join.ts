import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

export function renderJoin(ctx: RenderContext, data: Extract<Module, { module: "join" }>): void {
  const buttonText = data["button-text"] ?? "Join";
  const attrs = data.attributes ?? {};
  const className = attrs.class ?? "join-box";
  ctx.push(`<div class="${escapeHtml(className)}">`);
  ctx.push(`<a href="javascript:;">${escapeHtml(buttonText)}</a>`);
  ctx.push("</div>");
}
