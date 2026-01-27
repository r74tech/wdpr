/**
 * Depth processing module
 *
 * TypeScript port of Wikidot's depth.rs
 * Handles conversion of flat depth-annotated items into nested tree structures.
 */

/**
 * Represents an item in the depth tree
 */
export type DepthItem<L, T> =
  | { kind: "item"; value: T }
  | { kind: "list"; ltype: L; children: DepthList<L, T> };

export type DepthList<L, T> = DepthItem<L, T>[];

/**
 * Internal stack for building depth trees
 */
class DepthStack<L, T> {
  private finished: Array<{ ltype: L; list: DepthList<L, T> }> = [];
  private stack: Array<{ ltype: L; items: DepthItem<L, T>[] }>;

  constructor(topLtype: L) {
    this.stack = [{ ltype: topLtype, items: [] }];
  }

  private get last(): { ltype: L; items: DepthItem<L, T>[] } {
    return this.stack[this.stack.length - 1]!;
  }

  private get first(): { ltype: L; items: DepthItem<L, T>[] } {
    return this.stack[0]!;
  }

  private isSingle(): boolean {
    return this.stack.length === 1;
  }

  increaseDepth(ltype: L): void {
    this.stack.push({ ltype, items: [] });
  }

  decreaseDepth(): void {
    const popped = this.stack.pop();
    if (!popped) {
      throw new Error("No depth to pop off!");
    }
    this.push({ kind: "list", ltype: popped.ltype, children: popped.items });
  }

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

  private push(item: DepthItem<L, T>): void {
    this.last.items.push(item);
  }

  pushItem(item: T): void {
    this.push({ kind: "item", value: item });
  }

  lastType(): L {
    return this.last.ltype;
  }

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

  intoTrees(): Array<{ ltype: L; list: DepthList<L, T> }> {
    this.finishDepthList(null);
    return this.finished;
  }
}

/**
 * Process a list of depth-annotated items into nested tree structures.
 *
 * Each input item is a tuple of (depth, ltype, value) where:
 * - depth: the nesting level (0-based)
 * - ltype: the "list type" for grouping (e.g., bullet vs numbered)
 * - value: the actual item content
 *
 * Returns an array of finished trees, each with an ltype and a list of items.
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
