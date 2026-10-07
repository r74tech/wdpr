import { DEFAULT_SETTINGS, type PageRef } from "@wdprlib/ast";
import type { Token } from "../../lexer";
import { blockFallbackRule, blockRules, inlineRules, type ParseContext } from "../rules";
import { splitSpansAtDivBoundaries } from "../rules/inline/span/block-split";
import type { ParserOptions } from "./options";

export function createParseContext(
  tokens: Token[],
  options: ParserOptions = {},
  deferInclude?: (location: PageRef) => boolean,
): ParseContext {
  const ctx: ParseContext = {
    tokens,
    pos: 0,
    version: options.version ?? "wikidot",
    trackPositions: options.trackPositions ?? true,
    settings: options.settings ?? DEFAULT_SETTINGS,
    appendImplicitFootnoteBlock: options.appendImplicitFootnoteBlock ?? true,
    deferInclude,
    footnotes: [],
    tocEntries: [],
    codeBlocks: [],
    htmlBlocks: [],
    bibcites: [],
    diagnostics: [],
    blockRules,
    blockFallbackRule,
    inlineRules,
    scope: {
      footnoteBlockParsed: false,
    },
  };
  ctx.tokens = splitSpansAtDivBoundaries(ctx);
  return ctx;
}
