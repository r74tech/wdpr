import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

type JoinModule = Extract<Module, { module: "join" }>;

export function renderJoinMarkup(ctx: RenderContext, data: JoinModule): string {
  const buttonText = data["button-text"] ?? ctx.messages.text("module.join");
  const className = data.attributes?.class ?? "join-box";
  return `<div class="${escapeAttr(className)}"><a href="javascript:;">${escapeHtml(buttonText)}</a></div>`;
}
