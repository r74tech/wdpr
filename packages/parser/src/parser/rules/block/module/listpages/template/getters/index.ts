import {
  createBraceParamGetter,
  createFormattedGetter,
  createParenParamGetter,
  createTagsLinkedGetter,
} from "./parameterized";
import { SIMPLE_GETTERS } from "./simple";
import type { VariableGetter } from "./types";
import { excerptText } from "@wdprlib/ast";
import { literalWikitext } from "../literal";

/**
 * Create a getter function for a specific template variable.
 *
 * Handles all variable variants: parameterized (`{param}`), parenthesized
 * (`(param)`), formatted (`|format`), and simple. Unknown variable names return
 * a function that always returns an empty string, matching Wikidot's behavior.
 */
export function createVariableGetter(
  name: string,
  braceParam?: string,
  parenParam?: string,
  format?: string,
): VariableGetter {
  if (name === "excerpt")
    return (ctx) =>
      literalWikitext(
        excerptText(ctx.page.readableText ?? "", {
          start: braceParam,
          end: format,
          maxLength: parenParam === undefined ? undefined : Number(parenParam),
        }),
      );
  const braceGetter = braceParam !== undefined ? createBraceParamGetter(name, braceParam) : null;
  if (braceGetter) return braceGetter;
  if (braceParam !== undefined) return () => "";

  const parenGetter = parenParam !== undefined ? createParenParamGetter(name, parenParam) : null;
  if (parenGetter) return parenGetter;

  const formattedGetter = format !== undefined ? createFormattedGetter(name, format) : null;
  if (formattedGetter) return formattedGetter;

  const linkedTagsGetter = createTagsLinkedGetter(name, format);
  if (linkedTagsGetter) return linkedTagsGetter;

  return SIMPLE_GETTERS[name] ?? (() => "");
}
