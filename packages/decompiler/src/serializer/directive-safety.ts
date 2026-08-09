interface AttributeOptions {
  excludeInternal?: boolean;
  stripGeneratedIdPrefix?: boolean;
}

const SAFE_ATTRIBUTE_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const UNSAFE_QUOTED_VALUE = /["\t\r\n]|\[\[|\]\]/;
const UNSAFE_INLINE_LABEL = /[\t\r\n]|\[\[|\]\]/;
const UNSAFE_COLOR_VALUE = /[\r\n|]|##|\[\[|\]\]/;
const UNSAFE_PARENTHESIZED_VALUE = /[\r\n]|\(\(|\)\)|\[\[|\]\]/;

export function formatDirectiveAttributes(
  attributes: Record<string, string>,
  options: AttributeOptions = {},
): string {
  const formatted: string[] = [];

  for (const [name, originalValue] of Object.entries(attributes)) {
    if (options.excludeInternal && name.startsWith("_")) continue;
    const value =
      options.stripGeneratedIdPrefix && name === "id" && originalValue.startsWith("u-")
        ? originalValue.slice(2)
        : originalValue;
    if (!SAFE_ATTRIBUTE_NAME.test(name) || UNSAFE_QUOTED_VALUE.test(value)) continue;
    formatted.push(`${name}="${value}"`);
  }

  return formatted.length > 0 ? ` ${formatted.join(" ")}` : "";
}

export function isSafeBareToken(value: string): boolean {
  return value.length > 0 && !/[\s"']/.test(value) && !value.includes("[") && !value.includes("]");
}

export function isSafeQuotedAttributeValue(value: string): boolean {
  return !UNSAFE_QUOTED_VALUE.test(value);
}

export function isSafeInlineLabel(value: string): boolean {
  return value.trim().length > 0 && !UNSAFE_INLINE_LABEL.test(value);
}

export function isSafeBracketValue(value: string): boolean {
  return (
    value.trim().length > 0 &&
    !/[\t\r\n]/.test(value) &&
    !value.includes("[") &&
    !value.includes("]")
  );
}

export function isSafeTripleBracketValue(value: string): boolean {
  return isSafeBracketValue(value) && !value.includes("|");
}

export function isSafeColorValue(value: string): boolean {
  return value.trim().length > 0 && !UNSAFE_COLOR_VALUE.test(value);
}

export function isSafeParenthesizedValue(value: string): boolean {
  return value.trim().length > 0 && !UNSAFE_PARENTHESIZED_VALUE.test(value);
}

export function hasInlineMathCloseCandidate(value: string): boolean {
  return /\$\]\]/.test(value) || /[\r\n]/.test(value);
}

export function hasBlockCloseCandidate(
  value: string,
  blockNames: string | readonly string[],
): boolean {
  const names = typeof blockNames === "string" ? [blockNames] : blockNames;
  return names.some((name) => new RegExp(`\\[\\[\\/${name}(?=$|[^A-Za-z0-9_])`, "i").test(value));
}

export function neutralizeWikitextBoundaries(value: string): string {
  return value
    .split(/(\[\[|@@|@<)/)
    .map((chunk) =>
      chunk === "[[" || chunk === "@@" || chunk === "@<" ? literalizeWikitext(chunk) : chunk,
    )
    .join("");
}

export function literalizeWikitext(value: string): string {
  if (value.length === 0) return "@@@@";

  return value
    .split(/(\r\n|\r|\n)/)
    .map((part) => {
      if (/^(?:\r\n|\r|\n)$/.test(part) || part.length === 0) return part;
      return part
        .split(/(@@|@<|>@)/)
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => {
          if (chunk === "@@") return "@<@@>@";
          if (chunk === "@<") return "@@@<@@";
          if (chunk === ">@") return "@@>@@@";
          return `@@${chunk}@@`;
        })
        .join("");
    })
    .join("");
}
