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

/**
 * All block rules in priority order
 * Rules requiring lineStart are checked first
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
  divRule,
  // paragraphRule is not included - used as fallback
];

export { paragraphRule as blockFallbackRule };
