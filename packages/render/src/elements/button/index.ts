import { isPageButtonAction, type PageButtonData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { renderContainerAttrs } from "../container/attributes";
import { buttonLabel } from "./labels";

export function renderButton(ctx: RenderContext, data: PageButtonData): void {
  if (!isPageButtonAction(data.action)) {
    ctx.push(
      `<div class="error-block">${escapeHtml(ctx.messages.text({ id: "button.unknown", defaultMessage: "The button type is not recognized" }))}</div>`,
    );
    return;
  }
  const value = (v: string | null | undefined) => (v && v !== "0" ? v : null);
  const attributes: Record<string, string> = {
    class: value(data.attributes.class) ?? "wiki-standalone-button",
    href: "#",
    "data-wdpr-page-action": data.action,
  };
  const style = value(data.attributes.style);
  if (style !== null) attributes.style = style;
  ctx.push(
    `<a${renderContainerAttrs(attributes)}>${escapeHtml(value(data.text) ?? buttonLabel(ctx, data.action))}</a>`,
  );
}
