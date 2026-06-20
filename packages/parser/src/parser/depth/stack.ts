import type { DepthItem, DepthList } from "../depth";

/**
 * Internal stack-based builder for constructing depth trees incrementally.
 */
export class DepthStack<L, T> {
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
      this.finishDepthList(ltype);
      return;
    }

    this.decreaseDepth();
    this.increaseDepth(ltype);
  }

  pushItem(item: T): void {
    this.push({ kind: "item", value: item });
  }

  lastType(): L {
    return this.last.ltype;
  }

  intoTrees(): Array<{ ltype: L; list: DepthList<L, T> }> {
    this.finishDepthList(null);
    return this.finished;
  }

  private push(item: DepthItem<L, T>): void {
    this.last.items.push(item);
  }

  private finishDepthList(newLtype: L | null): void {
    while (this.stack.length > 1) {
      this.decreaseDepth();
    }

    const first = this.first;
    const ltype = first.ltype;
    const list = first.items;
    const actualNewLtype = newLtype ?? ltype;

    first.ltype = actualNewLtype;
    first.items = [];

    if (list.length > 0) {
      this.finished.push({ ltype, list });
    }
  }
}
