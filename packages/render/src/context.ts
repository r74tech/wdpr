import type { Element, ImageSource, LinkLocation, SyntaxTree } from "@wdpr/ast";
import type { RenderOptions, PageContext } from "./types";
import { escapeHtml, escapeAttr, sanitizeAttributes } from "./escape";

/**
 * Render context - manages state and output buffer during rendering
 */
export class RenderContext {
  private chunks: string[] = [];
  private _tocIndex = 0;
  private _footnoteIndex = 0;
  private _equationIndex = 0;
  private _htmlBlockIndex = 0;

  readonly options: RenderOptions;
  readonly footnotes: Element[][];
  readonly styles: string[];
  readonly htmlBlocks: string[];
  readonly tocElements: Element[];

  constructor(tree: SyntaxTree, options: RenderOptions = {}) {
    this.options = options;
    this.footnotes = options.footnotes ?? tree.footnotes ?? [];
    this.styles = tree.styles ?? [];
    this.htmlBlocks = tree["html-blocks"] ?? [];
    this.tocElements = tree["table-of-contents"] ?? [];
  }

  /** Append raw HTML to the output */
  push(html: string): void {
    this.chunks.push(html);
  }

  /** Append escaped text to the output */
  pushEscaped(text: string): void {
    this.chunks.push(escapeHtml(text));
  }

  /** Get the accumulated HTML output */
  getOutput(): string {
    return this.chunks.join("");
  }

  /** Get and increment the TOC index */
  nextTocIndex(): number {
    return this._tocIndex++;
  }

  /** Get and increment the footnote index */
  nextFootnoteIndex(): number {
    return this._footnoteIndex++;
  }

  /** Get and increment the equation index */
  nextEquationIndex(): number {
    return this._equationIndex++;
  }

  /** Get and increment the htmlBlock index */
  nextHtmlBlockIndex(): number {
    return this._htmlBlockIndex++;
  }

  /** Get page context */
  get page(): PageContext | undefined {
    return this.options.page;
  }

  /** Resolve an ImageSource to a src URL */
  resolveImageSource(source: ImageSource): string {
    switch (source.type) {
      case "url":
        return source.data;
      case "file1":
        return `/local--files/${source.data.file}`;
      case "file2":
        return `/local--files/${source.data.page}/${source.data.file}`;
      case "file3":
        return `/local--files/${source.data.site}/${source.data.page}/${source.data.file}`;
    }
  }

  /** Resolve a LinkLocation to an href string */
  resolvePageLink(location: LinkLocation): string {
    if (typeof location === "string") {
      return location;
    }
    // PageRef
    if (location.site) {
      return `https://${location.site}.wikidot.com/${location.page}`;
    }
    return `/${location.page}`;
  }

  /** Render an AttributeMap to HTML attribute string (with leading space) */
  renderAttributes(attributes: Record<string, string>): string {
    const safe = sanitizeAttributes(attributes);
    let result = "";
    for (const [key, value] of Object.entries(safe)) {
      if (value !== "") {
        result += ` ${key}="${escapeAttr(value)}"`;
      } else {
        result += ` ${key}=""`;
      }
    }
    return result;
  }
}
