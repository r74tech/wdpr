import { escapeHtml } from "../escape";

export class RenderOutputBuffer {
  private chunks: string[] = [];

  constructor(private readonly discard: boolean = false) {}

  push(html: string): void {
    if (this.discard) return;
    this.chunks.push(html);
  }

  pushEscaped(text: string): void {
    if (this.discard) return;
    this.chunks.push(escapeHtml(text));
  }

  getOutput(): string {
    return this.chunks.join("");
  }
}
