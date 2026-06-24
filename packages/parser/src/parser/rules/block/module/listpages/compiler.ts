/**
 *
 * Template compiler for the ListPages module.
 *
 * Compiles ListPages template strings (e.g., `"%%title%% by %%created_by%%"`)
 * into executable functions that can be called repeatedly with different page
 * data for fast rendering. The compilation step splits the template into static
 * string segments and dynamic getter functions, avoiding repeated regex matching
 * during rendering.
 *
 * Supported variable syntax:
 * - `%%name%%` - Simple variable (e.g., `%%title%%`, `%%rating%%`)
 * - `%%name{param}%%` - Parameterized variable (e.g., `%%content{2}%%`, `%%form_data{color}%%`)
 * - `%%name(param)%%` - Parenthesized parameter (e.g., `%%preview(100)%%`)
 * - `%%name|format%%` - Formatted variable (e.g., `%%created_at|%Y-%m-%d%%`, `%%tags_linked|/tag/%%`)
 *
 * The compiled function is a closure over the parsed template parts, providing
 * O(n) rendering time proportional to the number of template segments.
 *
 * @module
 */

import type { CompiledTemplate, VariableContext } from "./types";
import { createVariableGetter } from "./template/getters";
import { createTemplateVariableRegex } from "./template/syntax";

/**
 * Compile a ListPages template string into an executable function.
 *
 * The template is split into alternating static strings and dynamic getter
 * functions. The returned function concatenates these parts with the getter
 * functions evaluated against the provided variable context.
 *
 * @param template - The template string containing `%%variable%%` placeholders
 * @returns A compiled function that accepts a `VariableContext` and returns the rendered string
 */
export function compileTemplate(template: string): CompiledTemplate {
  const parts: (string | ((ctx: VariableContext) => string))[] = [];
  let lastIndex = 0;

  // Split template into static and dynamic parts
  for (const match of template.matchAll(createTemplateVariableRegex())) {
    // Add static part before this match
    if (match.index !== undefined && match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    // Convert variable to getter function
    const [, varName, braceParam, parenParam, format] = match;
    if (!varName) continue;
    const getter = createVariableGetter(varName.toLowerCase(), braceParam, parenParam, format);
    parts.push(getter);

    lastIndex = match.index !== undefined ? match.index + match[0].length : lastIndex;
  }

  // Add remaining static part
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  // Return compiled function
  return (ctx: VariableContext): string => {
    let result = "";
    for (const part of parts) {
      result += typeof part === "string" ? part : part(ctx);
    }
    return result;
  };
}
