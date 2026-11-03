import sanitizeHtml from "sanitize-html";
import { normalizeBooleanAttributes } from "./boolean-attributes";
import { parseIframeUrl } from "./iframe";

/**
 * Class names are limited to letters, digits, hyphen and underscore so the attribute value can
 * never carry quotes, `=`, or other attribute delimiters.
 */
const SAFE_CLASS_NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Build the sanitize-html options for embed content.
 *
 * Every attribute rewrite happens in `transformTags`, before sanitize-html applies its attribute
 * allowlist, scheme check, class filter, and escaping. The serialized string must not be edited
 * afterwards.
 */
export function createSanitizeConfig(baseUrl?: string): sanitizeHtml.IOptions {
  return {
    allowedTags: ["iframe"],
    allowedAttributes: {
      iframe: [
        "class",
        "src",
        "allow",
        "allowfullscreen",
        "frameborder",
        "height",
        "loading",
        "referrerpolicy",
        "sandbox",
        "title",
        "width",
      ],
    },
    allowedClasses: { iframe: [SAFE_CLASS_NAME] },
    allowedSchemes: ["https"],
    transformTags: {
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: normalizeIframeAttributes(attribs, baseUrl),
      }),
    },
  };
}

/**
 * Normalize boolean attributes and write `src` back in canonical URL form.
 *
 * An unparseable `src` is dropped; the later validation then rejects the embed.
 */
function normalizeIframeAttributes(
  attribs: Record<string, string>,
  baseUrl?: string,
): Record<string, string> {
  const result = normalizeBooleanAttributes(attribs);
  if (result.src !== undefined) {
    const url = parseIframeUrl(result.src.trim(), baseUrl);
    if (url === null) {
      delete result.src;
    } else {
      result.src = url.href;
    }
  }
  return result;
}
