import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockItem } from "./block-item";

export interface BlockParseResult {
  /** The parsed AST elements. */
  elements: Element[];
  /** Total number of tokens consumed from the stream. */
  consumed: number;
}

const excludedBlockRulesCache = new WeakMap<
  ParseContext["blockRules"],
  WeakMap<ReadonlySet<string>, ParseContext["blockRules"]>
>();

/**
 * Parses block-level elements from the token stream until a close
 * condition is satisfied.
 *
 * This is the workhorse parser used by container blocks (div, collapsible,
 * tabview, iftags, align, etc.) to parse their body content. It loops
 * through tokens, trying each block rule in priority order, and falls back
 * to the paragraph rule when nothing else matches.
 *
 * Whitespace and newline tokens between blocks are silently consumed.
 * The close condition receives a ParseContext snapshot at the current
 * position and should return `true` to stop parsing (the close tag
 * itself is NOT consumed here -- the caller handles that).
 *
 * The close condition is also injected into `blockCloseCondition` on
 * the context so that the paragraph parser can respect the enclosing
 * block's boundary.
 *
 * @param ctx            - Parse context positioned at the start of the body.
 * @param closeCondition - Predicate that signals the end of the block body.
 * @param options        - Optional settings.
 * @param options.excludedBlockNames - Block names that should be excluded
 *   from both rule dispatch and paragraph-boundary detection. The named
 *   rules are filtered out of `blockRules`, and the set is propagated to
 *   the inline parser via `ParseContext.excludedBlockNames` so that
 *   `BLOCK_OPEN` / `BLOCK_END_OPEN` tokens for these names do not trigger
 *   paragraph breaks.
 * @returns Parsed elements and total tokens consumed.
 */
export function parseBlocksUntil(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
  options?: { excludedBlockNames?: ReadonlySet<string> },
): BlockParseResult {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  const excluded = mergeExcludedBlockNames(
    ctx.scope.excludedBlockNames,
    options?.excludedBlockNames,
  );
  const blockRules = excluded ? getExcludedBlockRules(ctx.blockRules, excluded) : ctx.blockRules;
  const blockScope = {
    ...ctx.scope,
    blockCloseCondition: closeCondition,
    excludedBlockNames: excluded,
  };
  const checkCtx: ParseContext = { ...ctx, pos };
  const blockCtx: ParseContext = {
    ...ctx,
    pos,
    blockRules,
    scope: blockScope,
  };

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check close condition
    checkCtx.pos = pos;
    if (closeCondition(checkCtx)) {
      break;
    }

    // Skip whitespace
    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    // Skip newlines
    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    // Pass close condition and excluded names to context
    blockCtx.pos = pos;
    blockCtx.scope = blockScope;

    const result = parseBlockItem(blockCtx);
    elements.push(...result.elements);
    consumed += result.consumed;
    pos += result.consumed;
  }

  return { elements, consumed };
}

/**
 * An enclosing container's exclusions stay in force in its body: Wikidot keeps
 * a `[[collapsible]]` nested in a div literal when the div itself sits in a
 * collapsible.
 */
function mergeExcludedBlockNames(
  inherited: ReadonlySet<string> | undefined,
  added: ReadonlySet<string> | undefined,
): ReadonlySet<string> | undefined {
  if (!inherited?.size) return added;
  if (!added?.size) return inherited;
  return new Set([...inherited, ...added]);
}

function getExcludedBlockRules(
  blockRules: ParseContext["blockRules"],
  excluded: ReadonlySet<string>,
): ParseContext["blockRules"] {
  let byExcluded = excludedBlockRulesCache.get(blockRules);
  if (!byExcluded) {
    byExcluded = new WeakMap();
    excludedBlockRulesCache.set(blockRules, byExcluded);
  }

  const cached = byExcluded.get(excluded);
  if (cached) {
    return cached;
  }

  const filtered = blockRules.filter((rule) => !excluded.has(rule.name));
  byExcluded.set(excluded, filtered);
  return filtered;
}
