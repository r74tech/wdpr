import type { Module } from "@wdprlib/ast";
import { escapeAttr, escapeHtml } from "../../escape";

type JoinModule = Extract<Module, { module: "join" }>;

export function renderJoinMarkup(data: JoinModule): string {
  const buttonText = data["button-text"] ?? "Join";
  const className = data.attributes?.class ?? "join-box";
  return `<div class="${escapeAttr(className)}"><a href="javascript:;">${escapeHtml(buttonText)}</a></div>`;
}
