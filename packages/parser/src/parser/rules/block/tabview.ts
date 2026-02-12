/**
 *
 * Block rule for Wikidot tabbed content: `[[tabview]]` (or `[[tabs]]`).
 *
 * A tabview contains one or more `[[tab Label]]...[[/tab]]` blocks:
 *
 * ```
 * [[tabview]]
 * [[tab First Tab]]
 * Content of the first tab.
 * [[/tab]]
 * [[tab Second Tab]]
 * Content of the second tab.
 * [[/tab]]
 * [[/tabview]]
 * ```
 *
 * Key behaviours:
 * - Both `[[tabview]]` and `[[tabs]]` are accepted as the outer wrapper.
 * - Any attributes or text after the block name on the opening tag are
 *   silently ignored (Wikidot behaviour: `[[tabview Foo]]` is valid).
 * - If a tab has no label, it defaults to `"untitled"`.
 * - Tab body content is parsed as block-level markup.
 * - An empty tabview (no tabs) fails the rule, falling back to text.
 * - Non-tab content between tabs (other than whitespace/newlines) causes
 *   the rule to fail.
 *
 * @module
 */
import type { Element, TabData } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseBlocksUntil } from "./utils";

/**
 * Parses a single `[[tab Label]]...[[/tab]]` block within a tabview.
 *
 * The label is everything between the block name and `]]` (leading
 * whitespace is trimmed). An empty label defaults to `"untitled"`.
 * Newlines are not allowed in the label -- if one is encountered, the
 * parse fails.
 *
 * Body content is parsed as block-level markup via {@link parseBlocksUntil}.
 *
 * @param ctx - Parse context, positioned before the expected `[[tab ...]]`.
 * @returns The tab data and consumed count, or `null` on failure.
 */
function parseTab(ctx: ParseContext): { tab: TabData; consumed: number } | null {
  let pos = ctx.pos;
  let consumed = 0;

  // Skip whitespace/newlines before tab
  while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Expect [[
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  // Parse block name
  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "tab") {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  // Parse label (everything until ]])
  let label = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;
    if (token.type === "BLOCK_CLOSE") {
      break;
    }
    if (token.type === "NEWLINE") {
      // No newline allowed in label
      return null;
    }
    // Skip leading whitespace in label
    if (label === "" && token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }
    label += token.value;
    pos++;
    consumed++;
  }

  // Expect ]]
  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Skip newline after opening tag
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Close condition for [[/tab]]
  const closeCondition = (checkCtx: ParseContext): boolean => {
    const token = checkCtx.tokens[checkCtx.pos];
    if (token?.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
      if (closeNameResult?.name.toLowerCase() === "tab") {
        return true;
      }
    }
    return false;
  };

  // Parse body
  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;

  // Check for missing close tag
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: "Missing closing tag [[/tab]] for [[tab]]",
      position: ctx.tokens[ctx.pos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  // Consume [[/tab]]
  if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
    pos++;
    consumed++;
    const closeNameResult = parseBlockName(ctx, pos);
    if (closeNameResult) {
      pos += closeNameResult.consumed;
      consumed += closeNameResult.consumed;
    }
    if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
      pos++;
      consumed++;
    }
    // Skip trailing newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }
  }

  // Default label if empty
  const finalLabel = label.trim() || "untitled";

  return {
    tab: {
      label: finalLabel,
      elements: bodyResult.elements,
    },
    consumed,
  };
}

/**
 * Block rule for `[[tabview]]`/`[[tabs]]` with `[[tab]]` children.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "tabview" or "tabs" (case-insensitive).
 * 2. Skip any trailing text/attributes on the opening tag (ignored).
 * 3. Consume `]]` and optional newline.
 * 4. Repeatedly parse `[[tab Label]]...[[/tab]]` blocks via `parseTab()`.
 * 5. Whitespace and newlines between tabs are skipped; other content fails.
 * 6. Consume `[[/tabview]]` or `[[/tabs]]`.
 * 7. If no tabs were found, fail the rule.
 * 8. Emit a `tab-view` element containing the array of tab data.
 */
export const tabviewRule: BlockRule = {
  name: "tabview",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name.toLowerCase();
    // Accept tabview or tabs
    if (blockName !== "tabview" && blockName !== "tabs") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip any attributes/name (Wikidot ignores [[tabview Foo]])
    while (
      pos < ctx.tokens.length &&
      ctx.tokens[pos]?.type !== "BLOCK_CLOSE" &&
      ctx.tokens[pos]?.type !== "NEWLINE"
    ) {
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip newline after opening tag
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Parse tabs
    const tabs: TabData[] = [];
    const tabCtx: ParseContext = { ...ctx, pos };

    while (pos < ctx.tokens.length) {
      // Check for EOF
      if (ctx.tokens[pos]?.type === "EOF") {
        break;
      }

      // Check for closing [[/tabview]] or [[/tabs]]
      if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        const closeName = closeNameResult?.name.toLowerCase();
        if (closeName === "tabview" || closeName === "tabs") {
          break;
        }
      }

      // Try to parse a tab
      const tabResult = parseTab({ ...tabCtx, pos });
      if (tabResult) {
        tabs.push(tabResult.tab);
        pos += tabResult.consumed;
        consumed += tabResult.consumed;
      } else {
        // Skip whitespace/newlines between tabs
        if (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        } else {
          // Non-tab content in tabview - fail
          return { success: false };
        }
      }
    }

    // Check for missing close tag
    const hasTabviewClose =
      ctx.tokens[pos]?.type === "BLOCK_END_OPEN" &&
      (() => {
        const n = parseBlockName(ctx, pos + 1);
        const name = n?.name.toLowerCase();
        return name === "tabview" || name === "tabs";
      })();
    if (!hasTabviewClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/${blockName}]] for [[${blockName}]]`,
        position: openToken.position,
      });
    }

    // Consume [[/tabview]] or [[/tabs]]
    if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
      pos++;
      consumed++;
      const closeNameResult = parseBlockName(ctx, pos);
      if (closeNameResult) {
        pos += closeNameResult.consumed;
        consumed += closeNameResult.consumed;
      }
      if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
        pos++;
        consumed++;
      }
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
    }

    // Empty tabview is invalid - return failure so it falls back to plain text.
    // Note: Ideally, a failed tabview like "EMPTY:\n[[tabview]]\n[[/tabview]]" should
    // render as a single paragraph with <br /> separators (matching original Wikidot).
    // Currently, the paragraph parser treats [[tabview]] as a block-start token and
    // splits it into separate paragraphs. We chose to wrap each in <p> tags instead
    // of implementing complex lookahead to detect invalid tabviews.
    if (tabs.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "tab-view",
          data: tabs,
        },
      ],
      consumed,
    };
  },
};
