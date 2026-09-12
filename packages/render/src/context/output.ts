import { escapeHtml } from "../escape";

export class RenderOutputBuffer {
  private chunks: string[] = [];
  private deferred: Map<number, () => string> | null = null;

  constructor(private readonly discard: boolean = false) {}

  push(html: string): void {
    if (this.discard) return;
    this.chunks.push(html);
  }

  pushEscaped(text: string): void {
    if (this.discard) return;
    this.chunks.push(escapeHtml(text));
  }

  pushDeferred(render: () => string): void {
    if (this.discard) return;
    this.deferred ??= new Map();
    this.deferred.set(this.chunks.length, render);
    this.chunks.push("");
  }

  getOutput(): string {
    if (this.deferred) {
      for (const [index, render] of this.deferred) this.chunks[index] = render();
    }
    return this.chunks.join("");
  }
}
