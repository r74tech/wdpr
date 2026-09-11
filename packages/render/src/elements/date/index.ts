import type { DateData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderDateOutput } from "./output";

/** Render a UTC fallback and the metadata used by the browser's date runtime. */
export function renderDate(ctx: RenderContext, data: DateData): void {
  ctx.push(renderDateOutput(data));
}
