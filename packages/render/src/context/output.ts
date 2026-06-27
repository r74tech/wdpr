import { escapeHtml } from "../escape";

export class RenderOutputBuffer {
  private chunks: string[] = [];

  push(html: string): void {
    this.chunks.push(html);
  }

  pushEscaped(text: string): void {
    this.chunks.push(escapeHtml(text));
  }

  getOutput(): string {
    return this.chunks.join("");
  }
}
