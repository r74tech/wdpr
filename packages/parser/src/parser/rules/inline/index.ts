import { embedBlockRule } from "../block/embed-block";
/**
 *
 * Central registry and priority-ordered list of all inline parsing rules.
 *
 * This module imports every inline rule, re-exports them for individual use,
 * and assembles them into the {@link inlineRules} array, which defines the
 * order in which rules are attempted during inline parsing.
 *
 * Rule ordering matters: earlier rules take priority when multiple rules
 * could match the same token. For example, formatting rules (bold, italic,
 * etc.) are tried before link rules, and the text/fallback rules are
 * placed last as catch-alls.
 *
 * The `fallbackRule` is exported separately as `inlineFallbackRule` because
 * it matches any token type and is used as a last resort when no other rule
 * succeeds. It is NOT included in the `inlineRules` array to prevent it
 * from short-circuiting more specific rules.
 *
 * @module
 */
import type { InlineRule } from "../types";
import { boldRule } from "./bold";
import { italicRule } from "./italic";
import { underlineRule } from "./underline";
import { strikethroughRule } from "./strikethrough";
import { superscriptRule } from "./superscript";
import { subscriptRule } from "./subscript";
import { monospaceRule } from "./monospace";
import { linkTripleRule } from "./link-triple";
import { linkSingleRule } from "./link-single";
import { linkAnchorRule } from "./link-anchor";
import { linkStarRule } from "./link-star";
import { autolinkRule } from "./autolink";
import { emailRule } from "./email";
import { colorRule } from "./color";
import {
  backslashLineBreakRule,
  newlineLineBreakRule,
  underscoreLineBreakRule,
} from "./line-break";
import { commentRule } from "./comment";
import { htmlInlineRule } from "./html";
import { rawRule } from "./raw";
import { spanRule, closeSpanRule } from "./span";
import { buttonRule } from "./button";
import { socialRule } from "./social";
import { dateRule } from "./date";
import { sizeRule } from "./size";
import { footnoteRule } from "./footnote";
import { imageRule } from "./image";
import { guillemetRule } from "./guillemet";
import { userRule } from "./user";
import { anchorNameRule } from "./anchor-name";
import { anchorRule } from "./anchor";
import { mathInlineRule } from "./math-inline";
import { equationRefRule } from "./equation-ref";
import { exprRule, ifRule, ifExprRule } from "./expr";
import { bibciteRule } from "./bibcite";
import { textRule, fallbackRule } from "./text";

export { boldRule } from "./bold";
export { italicRule } from "./italic";
export { underlineRule } from "./underline";
export { strikethroughRule } from "./strikethrough";
export { superscriptRule } from "./superscript";
export { subscriptRule } from "./subscript";
export { monospaceRule } from "./monospace";
export { linkTripleRule } from "./link-triple";
export { linkSingleRule } from "./link-single";
export { linkAnchorRule } from "./link-anchor";
export { linkStarRule } from "./link-star";
export { autolinkRule } from "./autolink";
export { colorRule } from "./color";
export {
  backslashLineBreakRule,
  newlineLineBreakRule,
  underscoreLineBreakRule,
} from "./line-break";
export { commentRule } from "./comment";
export { htmlInlineRule } from "./html";
export { rawRule } from "./raw";
export { spanRule, closeSpanRule } from "./span";
export { buttonRule } from "./button";
export { socialRule } from "./social";
export { dateRule } from "./date";
export { sizeRule } from "./size";
export { footnoteRule } from "./footnote";
export { imageRule } from "./image";
export { guillemetRule } from "./guillemet";
export { userRule } from "./user";
export { anchorNameRule } from "./anchor-name";
export { anchorRule } from "./anchor";
export { mathInlineRule } from "./math-inline";
export { equationRefRule } from "./equation-ref";
export { exprRule, ifRule, ifExprRule } from "./expr";
export { bibciteRule } from "./bibcite";
export { textRule, fallbackRule } from "./text";

/**
 * All inline rules in priority order.
 *
 * Rules are tried top-to-bottom against the current token. The first
 * rule whose `startTokens` match the token type and whose `parse()`
 * returns `{ success: true }` wins.
 *
 * Ordering rationale:
 * 1. Paired formatting markers (bold, italic, underline, strikethrough,
 *    superscript, subscript, monospace) -- most common inline syntax
 * 2. Link rules (triple, single, anchor, star) -- order matters because
 *    `[[[` must be tried before `[`
 * 3. Color, line-break, and comment rules
 * 4. Raw (verbatim) text
 * 5. Block-open-triggered rules (image, size, footnote, span, user,
 *    expr/if/ifexpr, anchor-name, anchor, math-inline, equation-ref)
 * 6. Bibcite (double-parenthesis syntax)
 * 7. Guillemet (typographic angle quotes)
 * 8. Text rule (catch-all for TEXT and WHITESPACE tokens)
 *
 * The `fallbackRule` is intentionally excluded; it is used as a
 * separate last-resort handler.
 */
export const inlineRules: InlineRule[] = [
  emailRule,
  boldRule,
  italicRule,
  underlineRule,
  strikethroughRule,
  superscriptRule,
  subscriptRule,
  monospaceRule,
  linkTripleRule,
  linkSingleRule,
  linkAnchorRule,
  linkStarRule,
  autolinkRule,
  colorRule,
  backslashLineBreakRule,
  underscoreLineBreakRule,
  newlineLineBreakRule,
  commentRule,
  htmlInlineRule,
  rawRule,
  imageRule,
  embedBlockRule,
  buttonRule,
  socialRule,
  dateRule,
  sizeRule,
  footnoteRule,
  spanRule,
  closeSpanRule,
  userRule,
  exprRule,
  ifRule,
  ifExprRule,
  anchorNameRule,
  anchorRule,
  mathInlineRule,
  equationRefRule,
  bibciteRule,
  guillemetRule,
  textRule,
];

export { fallbackRule as inlineFallbackRule };
