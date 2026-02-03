import type { Element, ImageSource, LinkLocation, SyntaxTree } from "@wdprlib/ast";
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
    const pageName = this.page?.pageName;
    switch (source.type) {
      case "url": {
        // Convert /path to /local--files/path (Wikidot file reference)
        const url = source.data;
        if (url.startsWith("/") && !url.startsWith("//")) {
          return `/local--files${url}`;
        }
        return url;
      }
      case "file1":
        // file1 uses current page context
        return pageName
          ? `/local--files/${pageName}/${source.data.file}`
          : `/local--files/${source.data.file}`;
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
    // PageRef - Wikidot normalizes page names
    const page = location.page;

    // Handle special cases first
    // //path - protocol-relative or special routing
    if (page.startsWith("//")) {
      return page.toLowerCase();
    }

    // Handle # in page name (anchor routing like scp-series#001 or MAIN/#/page)
    // The # and everything after should be preserved as-is
    const hashIdx = page.indexOf("#");
    if (hashIdx !== -1) {
      let pagePart = page.slice(0, hashIdx);
      const anchor = page.slice(hashIdx);
      // Remove trailing slash before # (MAIN/ -> MAIN for MAIN/#/page)
      if (pagePart.endsWith("/")) {
        pagePart = pagePart.slice(0, -1);
      }
      // Don't apply slash-to-hyphen conversion for page part before #
      return `/${pagePart.toLowerCase()}${anchor.toLowerCase()}`;
    }

    const normalizedPage = this.normalizePageName(page);

    if (location.site) {
      return `https://${location.site}.wikidot.com/${normalizedPage}`;
    }
    return `/${normalizedPage}`;
  }

  /** Normalize a page name according to Wikidot rules */
  private normalizePageName(page: string): string {
    // Lowercase
    let normalized = page.toLowerCase();
    // Remove space after category separator (system: Recent -> system:Recent)
    normalized = normalized.replace(/:\s+/g, ":");
    // Replace spaces with hyphens (Wikidot URL normalization)
    normalized = normalized.replace(/\s+/g, "-").trim();
    // Replace / with - (except at start)
    if (!normalized.startsWith("/")) {
      normalized = normalized.replace(/\//g, "-");
    }
    return normalized;
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
