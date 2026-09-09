/**
 *
 * Block rule for Wikidot definition lists written with the `: key : value` syntax.
 *
 * Each item starts at the beginning of a line with a COLON, followed by
 * mandatory whitespace, the key (term), a second COLON, and then the value
 * (definition). Multiple consecutive items form a single `<dl>` block.
 *
 * ```
 * : Apple : A fruit that grows on trees.
 * : Banana : A yellow curved fruit.
 * ```
 *
 * Key parsing details:
 * - Whitespace after the first colon is required (`": key"` not `":key"`).
 * - The key portion supports inline markup (bold, links, etc.).
 * - The value ends at the next newline or the end of the document.
 * - Explicit line continuations (` _`) can extend a value across source lines.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { collectDefinitionItems } from "./collect";
import { toDefinitionListItems } from "./items";

/**
 * Block rule for Wikidot definition lists (`: key : value`).
 *
 * Parsing strategy:
 * 1. Verify the first token is a line-start COLON.
 * 2. Repeatedly call `parseDefinitionItem()` to collect entries.
 * 3. Stop when the current token is no longer a line-start COLON (i.e.
 *    the definition list block has ended).
 * 4. Convert internal items into the AST {@link DefinitionListItem} format.
 * 5. Emit a single `definition-list` element.
 */
export const definitionListRule: BlockRule = {
  name: "definitionList",
  startTokens: ["COLON"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const result = collectDefinitionItems(ctx);

    if (result.items.length === 0) {
      return { success: false };
    }

    const items = toDefinitionListItems(result.items.filter((item) => item.value.length > 0));
    return {
      success: true,
      elements: items.length > 0 ? [{ element: "definition-list", data: items }] : [],
      consumed: result.consumed,
    };
  },
};
