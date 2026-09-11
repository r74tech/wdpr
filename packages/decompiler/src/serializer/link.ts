import type { LinkData, LinkLabel } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { isSafeBareToken, isSafeBracketValue, isSafeTripleBracketValue } from "./directive-safety";

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
      if (!isSafeBracketValue(labelText)) return;
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

      if (
        !isSafeTripleBracketValue(pageName) ||
        (extraSuffix.length > 0 && !isSafeTripleBracketValue(extraSuffix)) ||
        (label !== "page" && !isSafeTripleBracketValue(labelText))
      ) {
        return;
      }

      if (label === "page") {
        ctx.push(`[[[${pageName}${extraSuffix}${targetSuffix}|]]]`);
      } else if (labelText === pageName && !/[#:]/.test(pageName)) {
        ctx.push(`[[[${pageName}${extraSuffix}${targetSuffix}]]]`);
      } else {
        ctx.push(`[[[${pageName}${extraSuffix}${targetSuffix} | ${labelText}]]]`);
      }
      break;
    }
    case "direct": {
      const url = typeof location === "string" ? location : "";
      const labelText = extractLabelText(label) || url;
      const targetPrefix = target === "new-tab" ? "*" : "";

      if (!isSafeBareToken(url) || !isSafeBracketValue(labelText)) {
        return;
      }

      ctx.push(`[${targetPrefix}${url} ${labelText}]`);
      break;
    }
    default: {
      const labelText = extractLabelText(label);
      const fallback = labelText || (typeof location === "string" ? location : "");
      ctx.pushUntrustedText(fallback);
    }
  }
}

/** Serialize an anchor-name element as `[[# name]]`. */
export function serializeAnchorName(ctx: SerializeContext, name: string): void {
  if (!isSafeBracketValue(name)) return;
  ctx.push(`[[# ${name}]]`);
}

/** Extract a plain-text string from a {@link LinkLabel}. */
function extractLabelText(label: LinkLabel): string {
  if (label === "page") return "";
  if ("text" in label) return label.text;
  if ("url" in label) return label.url ?? "";
  return "";
}
