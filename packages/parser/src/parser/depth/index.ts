/**
 *
 * Depth processing module for converting flat lists into nested tree structures.
 *
 * This is a TypeScript port of Wikidot's `depth.rs`. It handles the conversion
 * of flat depth-annotated items (such as bullet/numbered list entries at various
 * indentation levels) into properly nested tree structures. The algorithm uses an
 * internal stack to track open nesting levels and collapses them as depth decreases.
 *
 * Used primarily by the list parser and the table-of-contents builder to transform
 * flat sequences of items with depth annotations into hierarchical AST structures.
 *
 * @module
 */
import { DepthStack } from "./stack";

/**
 * Represents a single node in a depth tree.
 *
 * A node is either a leaf item containing a value, or a nested list containing
 * children. This recursive type allows arbitrarily deep nesting.
 *
 * @typeParam L - The list type discriminator (e.g., "bullet" vs "number" for lists,
 *               or `null` when list type distinction is not needed)
 * @typeParam T - The type of leaf item values
 */
export type DepthItem<L, T> =
  | { kind: "item"; value: T }
  | { kind: "list"; ltype: L; children: DepthList<L, T> };

/**
 * An ordered collection of depth tree nodes at the same level.
 *
 * @typeParam L - The list type discriminator
 * @typeParam T - The type of leaf item values
 */
export type DepthList<L, T> = DepthItem<L, T>[];

/**
 * Process a flat list of depth-annotated items into nested tree structures.
 *
 * This is the main entry point for the depth module. It takes a sequence of items,
 * each annotated with a nesting depth and a list type, and produces one or more
 * nested trees. Multiple trees are produced when the list type changes at the
 * root level (depth 0).
 *
 * The algorithm iterates through items sequentially, using a stack to track
 * open nesting levels. When depth increases, new levels are pushed; when depth
 * decreases, levels are popped and collapsed into their parent. When the list
 * type changes at the same depth, the current list is finalized and a new one begins.
 *
 * @typeParam L - The list type discriminator
 * @typeParam T - The type of leaf item values
 * @param topLtype - The default list type for the root level
 * @param items - Flat sequence of depth-annotated items, where each item has:
 *   - `depth`: the 0-based nesting level
 *   - `ltype`: the list type for grouping (e.g., "bullet" vs "number")
 *   - `value`: the actual item content
 * @param ltypeEquals - Equality comparator for list types (defaults to `===`)
 * @returns Array of finished trees, each with an `ltype` and a `list` of nested items.
 *          Multiple trees are returned when the list type changes at depth 0.
 */
export function processDepths<L, T>(
  topLtype: L,
  items: Array<{ depth: number; ltype: L; value: T }>,
  ltypeEquals: (a: L, b: L) => boolean = (a, b) => a === b,
): Array<{ ltype: L; list: DepthList<L, T> }> {
  const stack = new DepthStack<L, T>(topLtype);

  // The depth value for the previous item
  let previous = 0;

  // Iterate through each of the items
  for (const { depth, ltype, value } of items) {
    // Add or remove new depth levels as appropriate,
    // based on what our new depth value is compared
    // to the value in the previous iteration.
    //
    // If previous == depth, then neither of these for loops will run
    // If previous < depth, then only the first will run
    // If previous > depth, then only the second will run

    // Open new levels
    for (let i = previous; i < depth; i++) {
      stack.increaseDepth(ltype);
    }

    // Close existing levels
    for (let i = depth; i < previous; i++) {
      stack.decreaseDepth();
    }

    // Create new level if the type doesn't match
    //
    // Here we decrease and increase the depth to close
    // the current layer, then make a new one with the
    // type this item has.
    //
    // We'll keep appending to this remade layer until
    // we hit a different depth or a different type.
    if (!ltypeEquals(stack.lastType(), ltype)) {
      stack.newList(ltype);
    }

    // Push element and update state
    stack.pushItem(value);
    previous = depth;
  }

  return stack.intoTrees();
}
