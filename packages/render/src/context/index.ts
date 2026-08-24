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
  WikitextSettings,
} from "@wdprlib/ast";
import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import type { RenderOptions, PageContext } from "../types";
import { renderAttributeString } from "./attributes";
import { BibliographyIndex } from "./bibliography";
import { RenderCounters } from "./counters";
import { RenderOutputBuffer } from "./output";
import { StyleSlotState } from "./style-slots";
import {
  resolveImageSource as resolveImageSourceUrl,
  resolvePageLink as resolvePageLinkUrl,
} from "./urls";

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
 * - A lazy bibliography citation index built from `bibliography-block`
 *   elements when a citation is rendered
 */
export class RenderContext {
  /** Accumulated HTML fragments; joined by {@link getOutput}. */
  private output: RenderOutputBuffer;
  /**
   * When true, style elements in the AST are rendered rather than
   * silently skipped. Set while rendering children of unresolved
   * `[[iftags]]` blocks whose styles were not collected during resolve.
   */
  renderInlineStyles = false;
  /** State for style slots collected while rendering unresolved `[[iftags]]` blocks. */
  private _styleSlots = new StyleSlotState();
  /** Sequential counters and ID suffix state for this render pass. */
  private counters: RenderCounters;
  private readonly collectedStyles: string[] | null;
  private readonly emitStyleTags: boolean;

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
  /** Lazily built bibliography lookup data. */
  private readonly bibliography: BibliographyIndex;

  /**
   * Create a new render context from a parsed syntax tree.
   *
   * @param tree - The syntax tree produced by the parser. Footnotes,
   *   styles, html-blocks, and table-of-contents data are extracted from
   *   the tree and stored for later use by element renderers.
   * @param options - Caller-supplied render configuration. Missing fields
   *   fall back to safe defaults.
   */
  constructor(
    tree: SyntaxTree,
    options: RenderOptions = {},
    execution: {
      collectedStyles?: string[];
      emitStyleTags?: boolean;
      discardOutput?: boolean;
    } = {},
  ) {
    this.output = new RenderOutputBuffer(execution.discardOutput);
    this.settings = options.settings ?? DEFAULT_SETTINGS;
    this.counters = new RenderCounters(this.settings.useTrueIds);
    this.options = options;
    this.collectedStyles = execution.collectedStyles ?? null;
    this.emitStyleTags = execution.emitStyleTags ?? true;
    this.footnotes = options.footnotes ?? tree.footnotes ?? [];
    this.styles = tree.styles ?? [];
    this.htmlBlocks = tree["html-blocks"] ?? [];
    this.tocElements = tree["table-of-contents"] ?? [];

    this.bibliography = new BibliographyIndex(tree.elements);
  }

  /** Return the 1-indexed bibliography citation number for a label, if defined. */
  getBibliographyCitationNumber(label: string): number | undefined {
    return this.bibliography.getCitationNumber(label);
  }

  /**
   * Append a raw HTML string to the output buffer without escaping.
   *
   * @param html - Trusted HTML fragment to append.
   */
  push(html: string): void {
    this.output.push(html);
  }

  /**
   * HTML-escape the given text and append it to the output buffer.
   *
   * @param text - Untrusted text content (will be entity-escaped).
   */
  pushEscaped(text: string): void {
    this.output.pushEscaped(text);
  }

  /**
   * Join all buffered HTML fragments and return the final HTML string.
   *
   * @returns The complete rendered HTML output.
   */
  getOutput(): string {
    return this.output.getOutput();
  }

  /** Enter a style slot: subsequent {@link pushToStyleSlot} calls collect into this slot. */
  enterStyleSlot(slotId: number): void {
    this._styleSlots.enter(slotId);
  }

  /** Exit the current style slot. */
  exitStyleSlot(): void {
    this._styleSlots.exit();
  }

  /** Whether a style slot is currently active. */
  hasActiveStyleSlot(): boolean {
    return this._styleSlots.hasActiveSlot();
  }

  /** Push a CSS string into the active style slot. */
  pushToStyleSlot(css: string): void {
    this._styleSlots.push(css);
  }

  /** Record a rendered style and report whether its tag should be emitted. */
  recordStyle(css: string): boolean {
    this.collectedStyles?.push(css);
    return this.emitStyleTags;
  }

  /** Retrieve collected CSS strings for a given style slot. */
  getStyleSlotContents(slotId: number): string[] {
    return this._styleSlots.getContents(slotId);
  }

  /**
   * Return the current TOC heading index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextTocIndex(): number {
    return this.counters.nextTocIndex();
  }

  /**
   * Return the current footnote index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextFootnoteIndex(): number {
    return this.counters.nextFootnoteIndex();
  }

  /**
   * Return the current equation index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextEquationIndex(): number {
    return this.counters.nextEquationIndex();
  }

  /**
   * Return the current HTML block index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextHtmlBlockIndex(): number {
    return this.counters.nextHtmlBlockIndex();
  }

  /**
   * Advance the bibliography citation counter and return the new value.
   * Used to generate unique `bibcite-N-XXXXX` element IDs.
   *
   * @returns The counter value after incrementing (1-based).
   */
  nextBibciteCounter(): number {
    return this.counters.nextBibciteCounter();
  }

  /**
   * Return the current tab-view index and advance the counter.
   *
   * @returns The index before incrementing (0-based).
   */
  nextTabViewIndex(): number {
    return this.counters.nextTabViewIndex();
  }

  /**
   * Generate an element ID.
   * When useTrueIds is true, returns `${prefix}${index}`.
   * When false, appends a random suffix to prevent collisions across fragments.
   */
  generateId(prefix: string, index: number | string): string {
    return this.counters.generateId(prefix, index);
  }

  /**
   * Generate a fixed element ID (no index).
   * When useTrueIds is false, appends a random suffix.
   */
  generateFixedId(name: string): string {
    return this.counters.generateFixedId(name);
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
    return resolveImageSourceUrl(source, this.settings, this.page);
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
   * @returns The resolved href string, starting with `/` for local or unresolved
   *   cross-site pages and `https://` when a cross-site domain is known.
   */
  resolvePageLink(location: LinkLocation): string {
    return resolvePageLinkUrl(location, this.page);
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
    return renderAttributeString(attributes);
  }
}
