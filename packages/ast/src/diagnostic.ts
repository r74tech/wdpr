/**
 * Diagnostic types for reporting parse-time issues.
 *
 * When the parser encounters syntactically questionable or invalid markup
 * (e.g. an unclosed `[[div]]` block), it records a {@link Diagnostic} rather
 * than throwing an error. The parser is lenient: it always produces an AST,
 * even when diagnostics are present.
 *
 * Diagnostics are returned alongside the AST via {@link ParseResult}.
 *
 * @since 2.0.0
 * @module
 */

import type { Position } from "./position";
import type { SyntaxTree } from "./element";

/**
 * Severity level of a diagnostic.
 *
 * - `"error"` — the markup is structurally broken (e.g. inline `[[div]]`
 *   without a newline after `]]`).
 * - `"warning"` — the markup is likely unintentional but the parser can
 *   recover (e.g. a missing `[[/div]]` close tag).
 * - `"info"` — informational hints (e.g. deprecated syntax).
 *
 * @since 2.0.0
 * @group Diagnostics
 */
export type DiagnosticSeverity = "error" | "warning" | "info";

/**
 * A single diagnostic emitted during parsing.
 *
 * Each diagnostic pinpoints a source location via {@link Position} and
 * carries a machine-readable {@link Diagnostic.code | code} string for
 * programmatic filtering (e.g. `"unclosed-block"`, `"inline-block-element"`).
 *
 * @example
 * ```ts
 * import { parse } from "@wdprlib/parser";
 *
 * const { ast, diagnostics } = parse("[[div]]\nHello");
 * for (const d of diagnostics) {
 *   console.log(`[${d.severity}] ${d.message} (line ${d.position.start.line})`);
 * }
 * ```
 *
 * @since 2.0.0
 * @group Diagnostics
 */
export interface Diagnostic {
  /** How severe the issue is. */
  severity: DiagnosticSeverity;

  /**
   * Machine-readable identifier for the diagnostic kind.
   *
   * Current codes:
   * - `"unclosed-block"` — a block element has no matching close tag.
   * - `"inline-block-element"` — a block element (e.g. `[[div]]`) is used
   *   inline without the required trailing newline.
   */
  code: string;

  /** Human-readable description of the issue. */
  message: string;

  /** Source range where the issue was detected. */
  position: Position;

  /**
   * An optional related source range that provides additional context
   * (e.g. the opening tag position when reporting a missing close tag).
   */
  relatedPosition?: Position;
}

/**
 * The result of parsing a Wikidot markup string.
 *
 * Contains both the parsed AST and any diagnostics emitted during parsing.
 * The AST is always produced, even when diagnostics are present — the parser
 * is lenient and recovers from errors.
 *
 * @example
 * ```ts
 * import { parse } from "@wdprlib/parser";
 *
 * const result = parse("**bold** and //italic//");
 * console.log(result.ast.elements); // AST nodes
 * console.log(result.diagnostics);  // [] (no issues)
 * ```
 *
 * @since 2.0.0
 * @group Diagnostics
 */
export interface ParseResult {
  /** The parsed syntax tree. */
  ast: SyntaxTree;

  /** Diagnostics emitted during parsing (empty when the input is clean). */
  diagnostics: Diagnostic[];
}
