/**
 *
 * Central rendering context that tracks state during a single HTML render pass.
 *
 * Every render invocation creates one {@link RenderContext} instance, which serves
 * as both an output buffer and a registry for sequential counters (footnotes,
 * TOC headings, equations, HTML blocks, bibliography citations). The context
 * also exposes helpers for resolving image sources, page links, and
 * HTML attribute maps -- operations that depend on the current
 * {@link WikitextSettings} and {@link PageContext}.
 *
 * @module
 */

import type {
  Element,
  ImageSource,
  LinkLocation,
  SyntaxTree,
  BibliographyBlockData,
  DefinitionListItem,
  WikitextSettings,
} from "@wdprlib/ast";
import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import type { RenderOptions, PageContext } from "./types";
import { escapeHtml, escapeAttr, sanitizeAttributes } from "./escape";

/**
 * Manages rendering state and accumulates HTML output for a single render pass.
 *
 * The context is created once per call to `renderToHtml` and threaded through
 * every element renderer. It provides:
 *
 * - An HTML output buffer ({@link push}, {@link pushEscaped}, {@link getOutput})
 * - Sequential counters for footnotes, TOC entries, equations, etc.
 * - ID generation that optionally appends a random suffix to avoid collisions
 *   when multiple rendered fragments coexist on the same page
 * - Resolution of {@link ImageSource} and {@link LinkLocation} values into
 *   concrete URLs, applying Wikidot page-name normalization rules
 * - Attribute rendering with XSS sanitization
 * - A bibliography map built by scanning the AST for `bibliography-block`
 *   elements, assigning continuous 1-indexed citation numbers across blocks
 */
export class RenderContext {
  /** Accumulated HTML fragments; joined by {@link getOutput}. */
  private chunks: string[] = [];
  /** Auto-incrementing counter for table-of-contents heading IDs. */
  private _tocIndex = 0;
  /** Auto-incrementing counter for footnote reference/body IDs. */
  private _footnoteIndex = 0;
  /** Auto-incrementing counter for equation numbering. */
  private _equationIndex = 0;
  /** Auto-incrementing counter for `[[html]]` block iframe indices. */
  private _htmlBlockIndex = 0;
  /** Auto-incrementing counter for unique bibliography citation IDs. */
  private _bibciteCounter = 0;
  /**
   * Random hex suffix appended to element IDs when `useTrueIds` is false.
   * Prevents ID collisions when multiple rendered fragments appear on one page.
   * `null` when `useTrueIds` is true (IDs are deterministic).
   */
  private _idSuffix: string | null;

  /** Merged wikitext settings (page-mode defaults when omitted). */
  readonly settings: WikitextSettings;
  /** Full render options supplied by the caller. */
  readonly options: RenderOptions;
  /** Footnote element arrays collected from the syntax tree. */
  readonly footnotes: Element[][];
  /** CSS `<style>` blocks extracted from the syntax tree. */
  readonly styles: string[];
  /** Raw HTML strings for `[[html]]` blocks, indexed by insertion order. */
  readonly htmlBlocks: string[];
  /** Pre-built TOC element tree for `[[toc]]` rendering. */
  readonly tocElements: Element[];
  /** Map from bibliography label to its 1-indexed citation number. */
  readonly bibliographyMap: Map<string, number>;
  /** Ordered bibliography definition-list entries from `[[bibliography]]` blocks. */
  readonly bibliographyEntries: DefinitionListItem[];

  /**
   * Create a new render context from a parsed syntax tree.
   *
   * @param tree - The syntax tree produced by the parser. Footnotes,
   *   styles, html-blocks, and table-of-contents data are extracted from
   *   the tree and stored for later use by element renderers.
   * @param options - Caller-supplied render configuration. Missing fields
   *   fall back to safe defaults.
   */
  constructor(tree: SyntaxTree, options: RenderOptions = {}) {
    this.settings = options.settings ?? DEFAULT_SETTINGS;
    // When useTrueIds is false, generate a per-context random suffix for all IDs
    this._idSuffix = this.settings.useTrueIds ? null : Math.random().toString(16).slice(2, 8);
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

  /**
   * Recursively scan the AST for `bibliography-block` elements and assign
   * continuous 1-indexed citation numbers to each unique label.
   *
   * Duplicate labels across multiple bibliography blocks receive the same
   * number, preserving the order of first occurrence.
   *
   * @param elements - Array of AST elements to scan (may contain nested children).
   */
  private buildBibliographyMap(elements: Element[]): void {
    for (const el of elements) {
      if (el.element === "bibliography-block") {
        const data = el.data as BibliographyBlockData;
        for (const entry of data.entries) {
          if (!this.bibliographyMap.has(entry.key_string)) {
            // Use continuous numbering across all bibliography blocks
            const index = this.bibliographyMap.size + 1;
            this.bibliographyMap.set(entry.key_string, index);
            this.bibliographyEntries.push(entry);
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

  /**
   * Append a raw HTML string to the output buffer without escaping.
   *
   * @param html - Trusted HTML fragment to append.
   */
  push(html: string): void {
    this.chunks.push(html);
  }

  /**
   * HTML-escape the given text and append it to the output buffer.
   *
   * @param text - Untrusted text content (will be entity-escaped).
   */
  pushEscaped(text: string): void {
    this.chunks.push(escapeHtml(text));
  }

  /**
   * Join all buffered HTML fragments and return the final HTML string.
   *
   * @returns The complete rendered HTML output.
   */
  getOutput(): string {
    return this.chunks.join("");
  }

  /**
   * Return the current TOC heading index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextTocIndex(): number {
    return this._tocIndex++;
  }

  /**
   * Return the current footnote index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextFootnoteIndex(): number {
    return this._footnoteIndex++;
  }

  /**
   * Return the current equation index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextEquationIndex(): number {
    return this._equationIndex++;
  }

  /**
   * Return the current HTML block index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextHtmlBlockIndex(): number {
    return this._htmlBlockIndex++;
  }

  /**
   * Advance the bibliography citation counter and return the new value.
   * Used to generate unique `bibcite-N-XXXXX` element IDs.
   *
   * @returns The counter value after incrementing (1-based).
   */
  nextBibciteCounter(): number {
    return ++this._bibciteCounter;
  }

  /**
   * Generate an element ID.
   * When useTrueIds is true, returns `${prefix}${index}`.
   * When false, appends a random suffix to prevent collisions across fragments.
   */
  generateId(prefix: string, index: number | string): string {
    if (this._idSuffix === null) {
      return `${prefix}${index}`;
    }
    return `${prefix}${index}-${this._idSuffix}`;
  }

  /**
   * Generate a fixed element ID (no index).
   * When useTrueIds is false, appends a random suffix.
   */
  generateFixedId(name: string): string {
    if (this._idSuffix === null) {
      return name;
    }
    return `${name}-${this._idSuffix}`;
  }

  /**
   * The page context for the current render, if provided.
   * Contains page name, site, tags, and a page-existence checker.
   */
  get page(): PageContext | undefined {
    return this.options.page;
  }

  /**
   * Resolve an {@link ImageSource} to a concrete `src` URL string.
   *
   * Wikidot supports several image source forms:
   * - `url` -- a direct URL or local path
   * - `file1` -- a file attached to the current page (`/local--files/{page}/{file}`)
   * - `file2` -- a file attached to a named page
   * - `file3` -- a file on a named site and page
   *
   * Local paths (starting with `/` but not `//`) and file-type sources are
   * blocked when `allowLocalPaths` is false in the settings.
   *
   * @param source - The image source descriptor from the AST.
   * @returns The resolved URL, or `null` if the source is blocked by settings.
   */
  resolveImageSource(source: ImageSource): string | null {
    const pageName = this.page?.pageName;
    switch (source.type) {
      case "url": {
        const url = source.data;
        // Local path (e.g., /local-file.png) — blocked when allowLocalPaths is false
        if (url.startsWith("/") && !url.startsWith("//")) {
          if (!this.settings.allowLocalPaths) return null;
          return `/local--files${url}`;
        }
        return url;
      }
      case "file1":
        if (!this.settings.allowLocalPaths) return null;
        return pageName
          ? `/local--files/${pageName}/${source.data.file}`
          : `/local--files/${source.data.file}`;
      case "file2":
        if (!this.settings.allowLocalPaths) return null;
        return `/local--files/${source.data.page}/${source.data.file}`;
      case "file3":
        if (!this.settings.allowLocalPaths) return null;
        return `/local--files/${source.data.site}/${source.data.page}/${source.data.file}`;
    }
  }

  /**
   * Resolve a {@link LinkLocation} to an `href` string.
   *
   * Handles plain URL strings and structured `PageRef` objects. For page
   * references the page name is normalized to lowercase, spaces are replaced
   * with hyphens, and slashes become hyphens (Wikidot URL convention).
   * Anchors (`#`) and cross-site references (`site` field) are handled.
   *
   * @param location - A raw URL string or a `PageRef` object from the AST.
   * @returns The resolved href string, always starting with `/` for local
   *   pages or `https://` for cross-site links.
   */
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

  /**
   * Normalize a page name following Wikidot URL conventions.
   *
   * Rules applied in order: lowercase, strip spaces after category colon,
   * replace remaining spaces with hyphens, replace slashes with hyphens
   * (unless the name starts with `/`).
   *
   * @param page - Raw page name from the AST.
   * @returns Normalized page name suitable for URL paths.
   */
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

  /**
   * Sanitize and render an attribute map to an HTML attribute string.
   *
   * Dangerous attributes (event handlers, unsafe URLs) are stripped by
   * {@link sanitizeAttributes}. Each surviving key-value pair is escaped
   * and formatted as ` key="value"`.
   *
   * @param attributes - Raw attribute map from the AST.
   * @returns A string of HTML attributes with a leading space, or `""` if empty.
   */
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
