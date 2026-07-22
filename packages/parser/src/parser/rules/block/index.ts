/**
 *
 * Central registry for all block-level parser rules.
 *
 * This module imports every block rule, re-exports each one individually
 * (for selective use), and assembles them into the ordered `blockRules`
 * array that the main parser iterates through.
 *
 * Rule ordering matters: rules earlier in the array are tried first.
 * Line-start-only rules (comments, headings, lists, etc.) are naturally
 * filtered by the `requiresLineStart` flag, but among rules that share
 * a start token (e.g. BLOCK_OPEN), position in this array determines
 * priority. For example, `codeBlockRule` is tried before `collapsibleRule`
 * because both start with BLOCK_OPEN but code blocks should be matched
 * first.
 *
 * The paragraph rule is deliberately excluded from the array -- it serves
 * as a fallback and is exported separately as `blockFallbackRule`.
 *
 * @module
 */
import type { BlockRule } from "../types";
import { headingRule } from "./heading";
import { horizontalRuleRule } from "./horizontal-rule";
import { listRule } from "./list";
import { blockListRule } from "./block-list";
import { blockquoteRule } from "./blockquote";
import { definitionListRule } from "./definition-list";
import { paragraphRule } from "./paragraph";
import { divRule } from "./div";
import { codeBlockRule } from "./code";
import { collapsibleRule } from "./collapsible";
import { tableRule } from "./table";
import { tableBlockRule } from "./table-block";
import { moduleRule } from "./module";
import { footnoteBlockRule } from "./footnoteblock";
import { blockCommentRule } from "./comment";
import { centerRule } from "./center";
import { contentSeparatorRule } from "./content-separator";
import { clearFloatRule } from "./clear-float";
import { alignRule } from "./align";
import { tabviewRule } from "./tabview";
import { includeRule } from "./include";
import { mathBlockRule } from "./math";
import { htmlBlockRule } from "./html";
import { embedBlockRule } from "./embed-block";
import { iframeRule } from "./iframe";
import { iftagsRule } from "./iftags";
import { tocRule } from "./toc";
import { orphanLiRule } from "./orphan-li";
import { bibliographyRule } from "./bibliography";
import { galleryRule } from "./gallery";

export { headingRule } from "./heading";
export { horizontalRuleRule } from "./horizontal-rule";
export { listRule } from "./list";
export { blockListRule } from "./block-list";
export { blockquoteRule } from "./blockquote";
export { definitionListRule } from "./definition-list";
export { paragraphRule } from "./paragraph";
export { divRule } from "./div";
export { codeBlockRule } from "./code";
export { collapsibleRule } from "./collapsible";
export { tableRule } from "./table";
export { tableBlockRule } from "./table-block";
export { moduleRule } from "./module";
export { footnoteBlockRule } from "./footnoteblock";
export { blockCommentRule } from "./comment";
export { centerRule } from "./center";
export { contentSeparatorRule } from "./content-separator";
export { clearFloatRule } from "./clear-float";
export { alignRule } from "./align";
export { tabviewRule } from "./tabview";
export { includeRule } from "./include";
export { mathBlockRule } from "./math";
export { htmlBlockRule } from "./html";
export { embedBlockRule } from "./embed-block";
export { iframeRule } from "./iframe";
export { iftagsRule } from "./iftags";
export { tocRule } from "./toc";
export { orphanLiRule } from "./orphan-li";
export { bibliographyRule } from "./bibliography";
export { galleryRule } from "./gallery";

/**
 * All block rules in priority order.
 *
 * The main parser tries each rule in sequence for the current token.
 * Rules with `requiresLineStart: true` are only attempted when the token
 * is at line start, so their position relative to non-line-start rules
 * is less critical. Among rules that share the same `startTokens` entry,
 * earlier position wins.
 *
 * The paragraph rule is intentionally absent -- it is used as a fallback
 * when no other rule matches (see `blockFallbackRule`).
 */
export const blockRules: BlockRule[] = [
  blockCommentRule,
  clearFloatRule,
  contentSeparatorRule,
  centerRule,
  headingRule,
  horizontalRuleRule,
  tableRule,
  tableBlockRule,
  listRule,
  blockListRule,
  orphanLiRule,
  blockquoteRule,
  definitionListRule,
  codeBlockRule,
  collapsibleRule,
  tocRule,
  footnoteBlockRule,
  moduleRule,
  alignRule,
  tabviewRule,
  includeRule,
  mathBlockRule,
  htmlBlockRule,
  embedBlockRule,
  iframeRule,
  iftagsRule,
  bibliographyRule,
  galleryRule,
  divRule,
  // paragraphRule is not included - used as fallback
];

export { paragraphRule as blockFallbackRule };
