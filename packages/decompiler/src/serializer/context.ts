import type { SerializeOptions } from "../types";

/**
 * The two tiers of pending blank line.
 *
 * - `"none"` – no blank line pending
 * - `"paragraph"` – blank line requested after a paragraph (cleared by block elements)
 * - `"block"` – blank line requested after a block element (always emitted)
 */
type BlankLineType = "none" | "paragraph" | "block";

/**
 * Mutable context used during AST-to-Wikidot serialization.
 *
 * Manages an output buffer and a two-tier pending-blank-line system that
 * ensures correct spacing between paragraphs and block-level constructs.
 */
export class SerializeContext {
  readonly newline: string;
  /** Force `_\n` line-break syntax inside lists and definition lists. */
  forceLineBreakSyntax = false;
  /** Suppress extra blank lines after nested blockquotes. */
  insideBlockquote = false;
  /** When `true`, spans are emitted inline; when `false`, as block-level `span_`. */
  inParagraph = false;
  private buffer: string[] = [];
  private atLineStart = true;
  private _pendingBlankLine: BlankLineType = "none";

  constructor(options: SerializeOptions = {}) {
    this.newline = options.newline ?? "\n";
  }

  /**
   * Request a blank line after a block element.
   *
   * The blank line is emitted when the next content is pushed via
   * {@link push} or {@link pushBlockLine}.
   */
  requestBlankLine(): void {
    this._pendingBlankLine = "block";
  }

  /**
   * Request a blank line after a paragraph.
   *
   * Unlike {@link requestBlankLine}, this is cleared (not emitted) when
   * a block element follows via {@link pushBlockLine}, because no blank
   * line is needed between a paragraph and a subsequent block element.
   */
  requestParagraphBlankLine(): void {
    // Do not downgrade an existing block-level request
    if (this._pendingBlankLine === "none") {
      this._pendingBlankLine = "paragraph";
    }
  }

  /** Emit the pending blank line if one exists (any tier). */
  flushPendingBlankLine(): void {
    if (this._pendingBlankLine !== "none") {
      this.buffer.push(this.newline);
      this._pendingBlankLine = "none";
    }
  }

  /** Discard the pending blank line without emitting it. */
  clearPendingBlankLine(): void {
    this._pendingBlankLine = "none";
  }

  get hasPendingBlankLine(): boolean {
    return this._pendingBlankLine !== "none";
  }

  /** Push inline content. Any pending blank line is emitted first. */
  push(text: string): void {
    this.flushPendingBlankLine();
    this.buffer.push(text);
    this.atLineStart = text.endsWith(this.newline);
  }

  /**
   * Push a complete block line (content + newline).
   *
   * A block-tier pending blank line is flushed; a paragraph-tier pending
   * blank line is cleared (paragraph → block needs no separator).
   *
   * If the previous push left the cursor mid-line (e.g. bare inline
   * content emitted without a trailing newline, as happens when the
   * parser's `suppressDivAdjacentParagraphs` strips the `<p>` wrapper
   * before a `[[div]]`), prepend a newline so the block syntax begins
   * at column 0 — otherwise the re-parser sees `text.[[div]]` and
   * downgrades the div to inline text.
   */
  pushBlockLine(text: string): void {
    if (this._pendingBlankLine === "block") {
      this.flushPendingBlankLine();
    } else {
      this.clearPendingBlankLine();
    }
    if (!this.atLineStart) {
      this.buffer.push(this.newline);
    }
    this.buffer.push(text + this.newline);
    this.atLineStart = true;
  }

  /** Push a line (content + newline) as inline content. */
  pushLine(text: string): void {
    this.push(text + this.newline);
  }

  /** Push a blank line as inline content. */
  pushBlankLine(): void {
    this.push(this.newline);
  }

  /** Whether the cursor is currently at the start of a line. */
  isAtLineStart(): boolean {
    return this.atLineStart;
  }

  /** Return the full serialized output. */
  getOutput(): string {
    return this.buffer.join("");
  }

  /**
   * Return the serialized output for use inside a block container,
   * with trailing double-newlines collapsed to a single newline.
   */
  getBlockInnerOutput(): string {
    let output = this.getOutput();
    const nl = this.newline;
    while (output.endsWith(nl + nl)) {
      output = output.slice(0, -nl.length);
    }
    return output;
  }
}
