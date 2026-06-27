/**
 *
 * HTML, CSS, URL, and attribute sanitization utilities for the render pipeline.
 *
 * Every piece of user-supplied content that flows into the HTML output must
 * pass through one of these functions to prevent Cross-Site Scripting (XSS)
 * and CSS injection attacks.
 *
 * @module
 */
export { escapeAttr, escapeHtml, escapeJsString, escapeStyleContent } from "./html";
export { isDangerousUrl } from "./url";
export { isValidCssColor, sanitizeCssColor, isDangerousCssValue, sanitizeStyleValue } from "./css";
export { isValidEmail } from "./email";
export { isSafeAttribute, sanitizeAttributes } from "./attributes";
