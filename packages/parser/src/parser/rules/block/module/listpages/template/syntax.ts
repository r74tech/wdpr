/**
 * Creates a regex for matching ListPages template variables with all parameter variants.
 *
 * Captures: [1] variable name, [2] brace parameter, [3] paren parameter, [4] format string.
 * The format portion allows single `%` characters (for strftime tokens like `%Y`)
 * but stops at `%%` (which terminates the variable).
 */
export function createTemplateVariableRegex(): RegExp {
  return /%%([a-z_]+)(?:\{([^}]+)\})?(?:\((\d+)\))?(?:\|([^%]*(?:%(?!%)[^%]*)*))?%%/gi;
}
