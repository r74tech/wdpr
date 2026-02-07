/**
 * @module rules
 *
 * Aggregated exports for all parser rules (block and inline).
 *
 * The parser uses a rule-based architecture where each syntactic construct
 * (heading, list, bold, link, etc.) is defined as a separate rule. Rules are
 * organized into two categories:
 *
 * - **Block rules**: Match constructs that occupy one or more full lines
 *   (headings, lists, blockquotes, horizontal rules, paragraphs, etc.)
 * - **Inline rules**: Match constructs within a line of text
 *   (bold, italic, links, raw/code spans, etc.)
 *
 * Each category also has a fallback rule that is used when no other rule matches,
 * ensuring that all input is consumed.
 */

// Types
export type { ParseContext, RuleResult, BlockRule, InlineRule } from "./types";
export {
  currentToken,
  peekToken,
  checkToken,
  isAtEnd,
  hasClosingMarkerBeforeNewline,
} from "./types";

// Block rules
export { blockRules, blockFallbackRule } from "./block";
export { headingRule, horizontalRuleRule, listRule, blockquoteRule, paragraphRule } from "./block"; // TODO: exportが足りているのか確認

// Inline rules
export { inlineRules, inlineFallbackRule } from "./inline";
export {
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
  rawRule,
  textRule,
} from "./inline"; // TODO: exportが足りているのか確認
