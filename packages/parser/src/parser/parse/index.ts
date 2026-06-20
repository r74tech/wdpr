import type { ParseResult } from "@wdprlib/ast";
import { tokenize } from "../../lexer";
import { Parser } from "./parser";
import { parseLargePlainTextDocument, parsePlainNonAsciiDocument } from "./plain-non-ascii";
import { prepareSourceForParse } from "./source";
import type { ParserOptions } from "./options";

const COMPACT_TEXT_RUN_SOURCE_LENGTH = 100_000;

export type { ParserOptions } from "./options";
export { Parser } from "./parser";

/**
 * Parse a Wikidot markup string into an AST with diagnostics.
 *
 * @example
 * ```ts
 * import { parse } from "@wdprlib/parser";
 *
 * const { ast, diagnostics } = parse("**bold** and //italic//");
 * ```
 *
 * @since 2.0.0
 */
export function parse(source: string, options?: ParserOptions): ParseResult {
  const plainResult = parsePlainNonAsciiDocument(source);
  if (plainResult) {
    return plainResult;
  }

  const preprocessed = prepareSourceForParse(source, options);
  const largePlainResult = parseLargePlainTextDocument(preprocessed);
  if (largePlainResult) {
    return largePlainResult;
  }

  const tokens = tokenize(preprocessed, {
    trackPositions: options?.trackPositions,
    compactTextRuns: preprocessed.length >= COMPACT_TEXT_RUN_SOURCE_LENGTH,
  });
  return new Parser(tokens, options).parse();
}
