import type { Element } from "@wdprlib/ast";
import type { DecompileOptions } from "../types";

/**
 * Context maintained during HTML-to-AST decompilation.
 *
 * Tracks footnote content extracted from the footnotes-footer section and
 * a running TOC index for heading id matching.
 */
export class DecompileContext {
  readonly options: Required<DecompileOptions>;
  /** Maps footnote numbers (1-based) to their parsed content elements. */
  readonly footnoteContents: Map<number, Element[]> = new Map();
  /** Running TOC counter for heading id matching. */
  private tocIndex = 0;

  constructor(options: DecompileOptions = {}) {
    this.options = {
      inlineFootnotes: options.inlineFootnotes ?? true,
    };
  }

  /** Return the current TOC index and advance the counter. */
  nextTocIndex(): number {
    return this.tocIndex++;
  }
}
