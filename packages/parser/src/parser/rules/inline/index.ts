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
import { colorRule } from "./color";
import { backslashLineBreakRule, newlineLineBreakRule, underscoreLineBreakRule } from "./line-break";
import { commentRule } from "./comment";
import { rawRule } from "./raw";
import { spanRule, closeSpanRule } from "./span";
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
export { colorRule } from "./color";
export { backslashLineBreakRule, newlineLineBreakRule, underscoreLineBreakRule } from "./line-break";
export { commentRule } from "./comment";
export { rawRule } from "./raw";
export { spanRule, closeSpanRule } from "./span";
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
export { textRule, fallbackRule } from "./text";

/**
 * All inline rules in priority order
 */
export const inlineRules: InlineRule[] = [
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
  colorRule,
  backslashLineBreakRule,
  underscoreLineBreakRule,
  newlineLineBreakRule, // Must come after underscore rule
  commentRule,
  rawRule,
  imageRule,
  sizeRule,
  footnoteRule,
  spanRule,
  closeSpanRule, // Must come after spanRule to handle orphaned [[/span]]
  userRule,
  exprRule, // [[#expr ...]] - must come before anchorNameRule
  ifRule, // [[#if ... | ... | ...]]
  ifExprRule, // [[#ifexpr ... | ... | ...]]
  anchorNameRule, // [[# name]] - has space after #
  anchorRule,
  mathInlineRule,
  equationRefRule,
  guillemetRule,
  textRule,
  // fallbackRule is not included - used explicitly when no rule matches
];

export { fallbackRule as inlineFallbackRule };
