/**
 * Source code position
 */
export interface Point {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Offset (0-based) */
  offset: number;
}

/**
 * Source code range
 */
export interface Position {
  start: Point;
  end: Point;
}

/**
 * Helper to create a Point
 */
export function createPoint(line: number, column: number, offset: number): Point {
  return { line, column, offset };
}

/**
 * Helper to create a Position
 */
export function createPosition(start: Point, end: Point): Position {
  return { start, end };
}
