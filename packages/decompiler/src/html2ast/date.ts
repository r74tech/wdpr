import type { Element } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";

/** Recognize only generated date spans; ordinary span attributes must survive. */
export function recognizeDate(node: DomElement): Element | null {
  if (Object.keys(node.attribs).length !== 1) return null;
  const classes = node.attribs.class?.split(/\s+/) ?? [];
  if (!classes.includes("odate")) return null;
  let timestamp: number | null = null;
  let format: string | null = null;
  let hasFormat = false;
  for (const cls of classes) {
    if (cls === "odate") continue;
    if (/^time_\d+$/.test(cls) && timestamp === null) {
      timestamp = Number(cls.slice(5));
    } else if (cls.startsWith("format_") && !hasFormat) {
      try {
        format = decodeURIComponent(cls.slice(7)) || null;
      } catch {
        return null;
      }
      hasFormat = true;
    } else return null;
  }
  if (timestamp === null || !Number.isSafeInteger(timestamp) || timestamp > 8_640_000_000_000)
    return null;
  return {
    element: "date",
    data: {
      value: { timestamp, timezone: "UTC" },
      format,
      hover: format?.split("|").slice(1).includes("agohover") ?? false,
    },
  };
}
