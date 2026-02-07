/**
 * Source position tracking for Wikidot markup.
 *
 * Every token produced by the parser can carry a {@link Position} that maps it
 * back to its original location in the source text. This is used for error
 * reporting, source-map generation, and editor integration.
 *
 * Both {@link Point} and {@link Position} follow the
 * [unist Position](https://github.com/syntax-tree/unist#position) convention:
 * lines and columns are **1-based**, offsets are **0-based**.
 *
 * @module
 */

/**
 * A single point in the source text.
 *
 * Represents one end (start or end) of a {@link Position} range.
 * Line and column are 1-based to match text-editor conventions;
 * offset is 0-based for direct use with `String.prototype.slice()`.
 *
 * @group Source Position
 */
export interface Point {
  /** Line number in the source text (1-based: the first line is line 1) */
  line: number;
  /** Column number within the line (1-based: the first character is column 1) */
  column: number;
  /** Character offset from the beginning of the source string (0-based) */
  offset: number;
}

/**
 * A contiguous range in the source text, defined by a start and end {@link Point}.
 *
 * The range is inclusive of `start` and exclusive of `end` — i.e., the
 * character at `end.offset` is **not** part of the range.
 *
 * @group Source Position
 */
export interface Position {
  /** The first character of the range */
  start: Point;
  /** One past the last character of the range */
  end: Point;
}

/**
 * Create a {@link Point} value.
 *
 * @param line - 1-based line number
 * @param column - 1-based column number
 * @param offset - 0-based character offset
 * @returns A frozen {@link Point} object
 *
 * @group Source Position
 */
export function createPoint(line: number, column: number, offset: number): Point {
  return { line, column, offset };
}

/**
 * Create a {@link Position} range from two {@link Point}s.
 *
 * @param start - Beginning of the range (inclusive)
 * @param end - End of the range (exclusive)
 * @returns A {@link Position} spanning `start..end`
 *
 * @group Source Position
 */
export function createPosition(start: Point, end: Point): Position {
  return { start, end };
}
