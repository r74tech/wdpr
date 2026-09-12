import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { getRateWidgetParts } from "./rate-markup";

/** Unresolved, invalid, and unregistered declarations produce no widget. */
export function renderRate(
  ctx: RenderContext,
  data: Extract<Module, { module: "rate" | "custom-rate" }>,
): void {
  if (!data.ref || !data.state) return;
  for (const part of getRateWidgetParts(ctx, data.state)) ctx.push(part);
}
