import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import type { Token } from "../../lexer";
import { blockFallbackRule, blockRules, inlineRules, type ParseContext } from "../rules";
import type { ParserOptions } from "./options";

export function createParseContext(tokens: Token[], options: ParserOptions = {}): ParseContext {
  return {
    tokens,
    pos: 0,
    version: options.version ?? "wikidot",
    trackPositions: options.trackPositions ?? true,
    settings: options.settings ?? DEFAULT_SETTINGS,
    appendImplicitFootnoteBlock: options.appendImplicitFootnoteBlock ?? true,
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
}
