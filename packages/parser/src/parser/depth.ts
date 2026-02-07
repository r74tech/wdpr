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
 * Internal stack-based builder for constructing depth trees incrementally.
 *
 * The stack tracks open nesting levels. As items are added at increasing depths,
 * new levels are pushed. When depth decreases, levels are popped and collapsed
 * into their parent as nested list nodes. When the list type changes at the same
 * depth, the current list is finalized and a new one begins.
 *
 * @typeParam L - The list type discriminator
 * @typeParam T - The type of leaf item values
 */
class DepthStack<L, T> {
  private finished: Array<{ ltype: L; list: DepthList<L, T> }> = [];
  private stack: Array<{ ltype: L; items: DepthItem<L, T>[] }>;

  /**
   * @param topLtype - The list type for the initial (top-level) nesting layer
   */
  constructor(topLtype: L) {
    this.stack = [{ ltype: topLtype, items: [] }];
  }

  /** Returns the topmost (deepest nesting) layer on the stack. */
  private get last(): { ltype: L; items: DepthItem<L, T>[] } {
    return this.stack[this.stack.length - 1]!;
  }

  /** Returns the bottommost (root) layer on the stack. */
  private get first(): { ltype: L; items: DepthItem<L, T>[] } {
    return this.stack[0]!;
  }

  /** Returns true if only the root layer remains on the stack. */
  private isSingle(): boolean {
    return this.stack.length === 1;
  }

  /**
   * Push a new nesting level onto the stack.
   * @param ltype - The list type for the new level
   */
  increaseDepth(ltype: L): void {
    this.stack.push({ ltype, items: [] });
  }

  /**
   * Pop the topmost nesting level and collapse it into a list node on its parent.
   * @throws Error if there is no level to pop (stack is empty)
   */
  decreaseDepth(): void {
    const popped = this.stack.pop();
    if (!popped) {
      throw new Error("No depth to pop off!");
    }
    this.push({ kind: "list", ltype: popped.ltype, children: popped.items });
  }

  /**
   * Start a new list at the current depth with a different list type.
   *
   * When the list type changes (e.g., from bullet to numbered) at the same depth,
   * this method finalizes the current list and begins a new one. At the root layer
   * the entire tree is finalized; at deeper layers a pop/push cycle suffices.
   *
   * @param ltype - The list type for the new list
   */
  newList(ltype: L): void {
    if (this.isSingle()) {
      // This is the last layer, so the pop/push trick doesn't work.
      // Instead, output this entire thing as a finished list tree,
      // then create a new one for the process to continue.
      this.finishDepthList(ltype);
    } else {
      // We can just decrease and increase to make a new list
      this.decreaseDepth();
      this.increaseDepth(ltype);
    }
  }

  /** Append a depth item to the current (topmost) layer. */
  private push(item: DepthItem<L, T>): void {
    this.last.items.push(item);
  }

  /**
   * Add a leaf item to the current nesting level.
   * @param item - The value to wrap in a leaf node
   */
  pushItem(item: T): void {
    this.push({ kind: "item", value: item });
  }

  /** Returns the list type of the topmost nesting level. */
  lastType(): L {
    return this.last.ltype;
  }

  /**
   * Finalize the current tree by collapsing all open layers into a single
   * finished tree, then reset the stack for continued processing.
   *
   * @param newLtype - The list type for the next tree, or null to reuse the current type.
   *                   Null is used by {@link intoTrees} since no further items will be added.
   */
  private finishDepthList(newLtype: L | null): void {
    // Wrap all opened layers
    // Start at 1 since we always have at least one layer
    while (this.stack.length > 1) {
      this.decreaseDepth();
    }

    // Return top-level layer
    const first = this.first;
    const ltype = first.ltype;
    const list = first.items;

    // For intoTrees(), we don't care what the new ltype is,
    // so we just reuse the last one.
    // But for newList() we do, we want a new list layer.
    const actualNewLtype = newLtype ?? ltype;

    // Reset the first layer
    first.ltype = actualNewLtype;
    first.items = [];

    // Only push if the list has elements
    if (list.length > 0) {
      this.finished.push({ ltype, list });
    }
  }

  /**
   * Finalize all remaining layers and return the completed trees.
   * @returns Array of finished trees, each with its list type and items
   */
  intoTrees(): Array<{ ltype: L; list: DepthList<L, T> }> {
    this.finishDepthList(null);
    return this.finished;
  }
}

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
