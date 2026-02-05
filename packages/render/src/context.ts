import type {
  Element,
  ImageSource,
  LinkLocation,
  SyntaxTree,
  BibliographyBlockData,
  DefinitionListItem,
} from "@wdprlib/ast";
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
  private _bibciteCounter = 0;

  readonly options: RenderOptions;
  readonly footnotes: Element[][];
  readonly styles: string[];
  readonly htmlBlocks: string[];
  readonly tocElements: Element[];
  /** Map from bibliography label to citation number (1-indexed) */
  readonly bibliographyMap: Map<string, number>;
  /** Bibliography entries (from bibliography-block) */
  readonly bibliographyEntries: DefinitionListItem[];

  constructor(tree: SyntaxTree, options: RenderOptions = {}) {
    this.options = options;
    this.footnotes = options.footnotes ?? tree.footnotes ?? [];
    this.styles = tree.styles ?? [];
    this.htmlBlocks = tree["html-blocks"] ?? [];
    this.tocElements = tree["table-of-contents"] ?? [];

    // Build bibliography map from tree elements
    this.bibliographyMap = new Map();
    this.bibliographyEntries = [];
    this.buildBibliographyMap(tree.elements);
  }

  /** Build bibliography label to number mapping from AST */
  private buildBibliographyMap(elements: Element[]): void {
    for (const el of elements) {
      if (el.element === "bibliography-block") {
        const data = el.data as BibliographyBlockData;
        let index = 1;
        for (const entry of data.entries) {
          if (!this.bibliographyMap.has(entry.key_string)) {
            this.bibliographyMap.set(entry.key_string, index);
            this.bibliographyEntries.push(entry);
            index++;
          }
        }
      }
      // Recursively check nested elements
      if ("data" in el && el.data && typeof el.data === "object") {
        const data = el.data as Record<string, unknown>;
        if ("elements" in data && Array.isArray(data.elements)) {
          this.buildBibliographyMap(data.elements as Element[]);
        }
      }
    }
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

  /** Get and increment the bibcite counter (for unique IDs) */
  nextBibciteCounter(): number {
    return ++this._bibciteCounter;
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
    // Remove leading slash to prevent protocol-relative URLs (//...)
    const safePage = normalizedPage.startsWith("/") ? normalizedPage.slice(1) : normalizedPage;

    if (location.site) {
      return `https://${location.site}.wikidot.com/${safePage}`;
    }
    return `/${safePage}`;
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
