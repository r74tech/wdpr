export class StyleSlotState {
  private activeSlotId: number | null = null;
  private contents = new Map<number, string[]>();

  enter(slotId: number): void {
    this.activeSlotId = slotId;
    if (!this.contents.has(slotId)) {
      this.contents.set(slotId, []);
    }
  }

  exit(): void {
    this.activeSlotId = null;
  }

  hasActiveSlot(): boolean {
    return this.activeSlotId !== null;
  }

  push(css: string): void {
    if (this.activeSlotId !== null) {
      this.contents.get(this.activeSlotId)!.push(css);
    }
  }

  getContents(slotId: number): string[] {
    return this.contents.get(slotId) ?? [];
  }
}
