import type { LinkData, LinkLabel } from "@wdprlib/ast";
import type { SerializeContext } from "./context";

/**
 * Serialize a link element to Wikidot syntax.
 *
 * Produces the appropriate syntax for anchor (`[# label]`), page
 * (`[[[page|label]]]`), and direct (`[url label]`) link types.
 */
export function serializeLink(ctx: SerializeContext, data: LinkData): void {
  const { type, link: location, label, target, extra } = data;

  switch (type) {
    case "anchor": {
      const labelText = extractLabelText(label);
      ctx.push(`[# ${labelText}]`);
      break;
    }
    case "page": {
      const pageName =
        typeof location === "string"
          ? location
          : location.site
            ? `${location.site}:${location.page}`
            : location.page;

      const targetSuffix = target === "new-tab" ? "*" : "";
      const extraSuffix = extra ?? "";
      const labelText = extractLabelText(label);

      if (label === "page" || labelText === pageName) {
        ctx.push(`[[[${pageName}${extraSuffix}${targetSuffix}]]]`);
      } else {
        ctx.push(`[[[${pageName}${extraSuffix}${targetSuffix} | ${labelText}]]]`);
      }
      break;
    }
    case "direct": {
      const url = typeof location === "string" ? location : "";
      const labelText = extractLabelText(label);
      const targetPrefix = target === "new-tab" ? "*" : "";

      if (labelIsUrl(label, url)) {
        ctx.push(`[${targetPrefix}${url}]`);
      } else {
        ctx.push(`[${targetPrefix}${url} ${labelText}]`);
      }
      break;
    }
    default: {
      const labelText = extractLabelText(label);
      ctx.push(labelText || (typeof location === "string" ? location : ""));
    }
  }
}

/** Serialize an anchor-name element as `[[# name]]`. */
export function serializeAnchorName(ctx: SerializeContext, name: string): void {
  ctx.push(`[[# ${name}]]`);
}

/** Extract a plain-text string from a {@link LinkLabel}. */
function extractLabelText(label: LinkLabel): string {
  if (label === "page") return "";
  if ("text" in label) return label.text;
  if ("url" in label) return label.url ?? "";
  return "";
}

/** Check whether the label represents the URL itself (no custom label text). */
function labelIsUrl(label: LinkLabel, url: string): boolean {
  if (label === "page") return false;
  if ("url" in label) return true;
  if ("text" in label) return label.text === url;
  return false;
}
