import type { DateData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { formatDirectiveAttributes } from "./directive-safety";

export function serializeDate(ctx: SerializeContext, data: DateData): void {
  const timestamp = data.value.timestamp;
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 8_640_000_000_000) return;
  let format = data.format || null;
  if (data.hover && !format?.split("|").slice(1).includes("agohover"))
    format = `${format ?? "%c"}|agohover`;
  ctx.push(`[[date ${timestamp}${format === null ? "" : formatDirectiveAttributes({ format })}]]`);
}
