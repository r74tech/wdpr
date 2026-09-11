/**
 * AST element types for Wikidot markup.
 *
 * Wikidot markup (`+ heading`, `**bold**`, `[[module ListPages]]`, etc.) is parsed into
 * a structured representation defined here. Each {@link Element} is a tagged union of
 * `{ element: tag, data: payload }`, where the data shape for each tag is defined in
 * {@link ElementDataMap}.
 *
 * @example
 * ```ts
 * import { parse } from "@wdprlib/parser";
 * const tree = parse("**Hello** world");
 * // tree.elements[0] → { element: "container", data: { type: "paragraph", ... } }
 * ```
 *
 * @module
 */

import type { CssLengthUnit } from "./css";

// ---------------------------------------------------------------------------
// Primitive types
// ---------------------------------------------------------------------------

/**
 * Key-value map of HTML attributes.
 * Populated from the Wikidot `_ class="foo" style="color:red"` attribute syntax.
 *
 * @group Primitives
 */
export type AttributeMap = Record<string, string>;

/**
 * Key-value map of include variables.
 * Populated from `[[include page | key=value]]` pairs.
 *
 * @group Primitives
 */
export type VariableMap = Record<string, string>;

/**
 * Text alignment direction.
 * Maps to Wikidot alignment blocks: `[[=]]` (center), `[[<]]` (left),
 * `[[>]]` (right), `[[==]]` (justify).
 *
 * @group Primitives
 */
export type Alignment = "left" | "right" | "center" | "justify";

/**
 * Image float alignment. Used in `[[image]]` positioning.
 *
 * When `float` is true, the image uses CSS float.
 * When false, it uses text-align only.
 *
 * @group Primitives
 */
export interface FloatAlignment {
  align: Alignment;
  /** Whether to use CSS float (true) or just text-align (false) */
  float: boolean;
}

// ---------------------------------------------------------------------------
// Container types
// ---------------------------------------------------------------------------

/**
 * Heading level (1-6). Corresponds to Wikidot `+` (h1) through `++++++` (h6).
 *
 * @group Container Types
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Heading configuration. Carries the level and whether this heading
 * should appear in the table of contents.
 *
 * In Wikidot, `+*` (asterisk suffix) excludes the heading from the TOC.
 *
 * @group Container Types
 */
export interface Heading {
  level: HeadingLevel;
  /** false when the heading uses `+*` syntax to opt out of the TOC */
  "has-toc": boolean;
}

/**
 * Discriminator for heading containers within {@link ContainerType}.
 *
 * @group Container Types
 */
export interface HeaderType {
  header: Heading;
}

/**
 * Discriminator for alignment-block containers within {@link ContainerType}.
 * Produced by `[[=]]`, `[[<]]`, `[[>]]`, and `[[==]]` blocks.
 *
 * @group Container Types
 */
export interface AlignType {
  align: Alignment;
}

/**
 * Container types expressible as plain string literals.
 * Covers inline formatting (`**bold**`, `//italics//`, etc.) and
 * block-level structures (`div`, `blockquote`, `table-cell`, etc.).
 *
 * @group Container Types
 */
export type StringContainerType =
  | "bold"
  | "italics"
  | "underline"
  | "superscript"
  | "subscript"
  | "strikethrough"
  | "monospace"
  | "span"
  | "div"
  | "blockquote"
  | "size"
  | "paragraph"
  | "heading"
  | "collapsible"
  | "definition-list"
  | "definition-list-item"
  | "definition-list-key"
  | "definition-list-value"
  | "table-row"
  | "table-cell";

/**
 * Union of all container type discriminators.
 * Every container element in the AST carries one of these to identify
 * what kind of container it is.
 *
 * - String literals: inline formatting and block structures
 * - {@link HeaderType}: heading elements (`+ Heading`)
 * - {@link AlignType}: alignment blocks (`[[=]]...[[/=]]`)
 *
 * @group Container Types
 */
export type ContainerType = StringContainerType | HeaderType | AlignType;

/**
 * Type guard: checks whether a {@link ContainerType} is a plain string literal.
 *
 * @group Container Types
 */
export function isStringContainerType(type: ContainerType): type is StringContainerType {
  return typeof type === "string";
}

/**
 * Type guard: checks whether a {@link ContainerType} is a {@link HeaderType}.
 *
 * @group Container Types
 */
export function isHeaderType(type: ContainerType): type is HeaderType {
  return typeof type === "object" && type !== null && "header" in type;
}

/**
 * Type guard: checks whether a {@link ContainerType} is an {@link AlignType}.
 *
 * @group Container Types
 */
export function isAlignType(type: ContainerType): type is AlignType {
  return typeof type === "object" && type !== null && "align" in type;
}

/**
 * Data payload for container elements (paragraphs, bold, headings, divs, etc.).
 *
 * Every nestable Wikidot construct (`**bold**`, `[[div]]...[[/div]]`,
 * `+ heading`, etc.) is represented as an `{ element: "container", data: ContainerData }`.
 *
 * The `_`-prefixed fields are internal parser bookkeeping that gets stripped before
 * the final AST is returned. They coordinate paragraph splitting and span unwrapping
 * during post-processing.
 *
 * @group Container Types
 */
export interface ContainerData {
  /** Identifies the kind of container and determines how it renders */
  type: ContainerType;
  /** HTML attributes specified via `_ class="..." style="..."` syntax */
  attributes: AttributeMap;
  /** Child elements nested inside this container */
  elements: Element[];
  /**
   * Set on `[[span_]]` elements. Signals the post-processor to merge adjacent
   * paragraphs, removing the `<p>` wrapper around the span's content.
   * Consumed during post-processing; never present in the final AST.
   * @internal
   */
  _paragraphStrip?: boolean;
  /**
   * Set on empty `[[span_]][[/span_]]` elements. Acts as a line-break absorber:
   * adjacent line-breaks are removed around this marker.
   * Consumed during post-processing; never present in the final AST.
   * @internal
   */
  _emptyParagraphStrip?: boolean;
  /**
   * Set on content that follows a blank line inside `[[span_]]`.
   * Indicates this content should be extracted outside its paragraph wrapper.
   * Consumed during post-processing; never present in the final AST.
   * @internal
   */
  _escapedFromParagraph?: boolean;
  /**
   * Set on an orphaned `[[/span]]` closing tag (no matching open tag).
   * The paragraph rule uses this to retroactively wrap preceding content in a span.
   * Consumed during post-processing; never present in the final AST.
   * @internal
   */
  _closeSpan?: boolean;
  /**
   * Set on the 2nd+ segments of a regular `[[span]]` that was split by blank lines.
   * Marks where the post-processor should split the enclosing paragraph.
   * Consumed during post-processing; never present in the final AST.
   * @internal
   */
  _splitByBlankLine?: boolean;
}

// ---------------------------------------------------------------------------
// Link types
// ---------------------------------------------------------------------------

/**
 * Link target window. Maps to the HTML `target` attribute.
 * In Wikidot, `*` suffix on a link (`[[[page*]]]`) sets `"new-tab"`.
 *
 * @group Link Types
 */
export type AnchorTarget = "new-tab" | "parent" | "top" | "same";

/**
 * Reference to an internal wiki page.
 * Produced by `[[[page]]]` or cross-site `[[[site:page]]]` syntax.
 *
 * @group Link Types
 */
export interface PageRef {
  /** Site name for cross-site links; null for same-site links */
  site: string | null;
  /** Page UNIX name (e.g. `"scp-001"`, `"system:page-tags"`) */
  page: string;
}

/**
 * Link destination: either a {@link PageRef} for internal wiki links
 * or a plain URL string for external links.
 *
 * @group Link Types
 */
export type LinkLocation = PageRef | string;

/**
 * Link display label.
 *
 * - `{ text: string }` — explicit text (`[[[page | label]]]`)
 * - `{ url: string | null }` — use the URL itself as the label
 * - `"page"` — use the page name as the label (`[[[page]]]`)
 *
 * @group Link Types
 */
export type LinkLabel = { text: string } | { url: string | null } | "page";

/**
 * Link classification, determined by the syntax used.
 *
 * - `"direct"` — bare URL (`[http://...]`)
 * - `"page"` — page link (`[[[some-page]]]`)
 * - `"interwiki"` — interwiki link (`[[[wikipedia:article]]]`)
 * - `"anchor"` — in-page anchor (`[[# section]]`)
 * - `"table-of-contents"` — TOC-generated link
 *
 * @group Link Types
 */
export type LinkType = "direct" | "page" | "interwiki" | "anchor" | "table-of-contents";

// ---------------------------------------------------------------------------
// Image types
// ---------------------------------------------------------------------------

/**
 * Image source. Wikidot supports four resolution strategies:
 *
 * - `"url"` — absolute URL
 * - `"file1"` — file attached to the current page (`filename`)
 * - `"file2"` — file on another page (`page/filename`)
 * - `"file3"` — file on another site (`site:page/filename`)
 *
 * @group Image Types
 */
export type ImageSource =
  | { type: "url"; data: string }
  | { type: "file1"; data: { file: string } }
  | { type: "file2"; data: { page: string; file: string } }
  | { type: "file3"; data: { site: string; page: string; file: string } };

// ---------------------------------------------------------------------------
// List types
// ---------------------------------------------------------------------------

/**
 * List style. `"bullet"` for `*` items, `"numbered"` for `#` items,
 * `"generic"` for `[[li]]` block items.
 *
 * @group List Types
 */
export type ListType = "bullet" | "numbered" | "generic";

/**
 * A single list item. Either a leaf with inline content, or a nested sub-list.
 *
 * @group List Types
 */
export type ListItem =
  | {
      "item-type": "elements";
      attributes: AttributeMap;
      elements: Element[];
    }
  | {
      "item-type": "sub-list";
      element: "list";
      data: ListData;
    };

/**
 * Data payload for a list element (`* item`, `# item`, or `[[li]]`).
 *
 * @group List Types
 */
export interface ListData {
  type: ListType;
  attributes: AttributeMap;
  items: ListItem[];
}

/**
 * A single entry in a definition list (`: key : value`).
 *
 * @group List Types
 */
export interface DefinitionListItem {
  /** Plain-text representation of the key (for quick lookups) */
  key_string: string;
  /** Rich-content key (may contain inline formatting) */
  key: Element[];
  /** Rich-content value */
  value: Element[];
}

// ---------------------------------------------------------------------------
// Table types
// ---------------------------------------------------------------------------

/**
 * A single table cell (`||` delimited).
 *
 * @group Table Types
 */
export interface TableCell {
  /** true if this cell is a header cell (`||~`) */
  header: boolean;
  /** Number of columns this cell spans (via `||` count) */
  "column-span": number;
  /** Explicit alignment, or null for default */
  align: Alignment | null;
  attributes: AttributeMap;
  elements: Element[];
}

/**
 * A single table row.
 *
 * @group Table Types
 */
export interface TableRow {
  attributes: AttributeMap;
  cells: TableCell[];
}

/**
 * Data payload for a table element.
 *
 * @group Table Types
 */
export interface TableData {
  attributes: AttributeMap;
  rows: TableRow[];
}

// ---------------------------------------------------------------------------
// Block element data types
// ---------------------------------------------------------------------------

/**
 * A single tab in a `[[tabview]]` block.
 *
 * @group Block Elements
 */
export interface TabData {
  /** Tab title displayed in the tab bar */
  label: string;
  /** Content inside the tab panel */
  elements: Element[];
}

/**
 * Data for a `[[code]]` block.
 *
 * @group Block Elements
 */
export interface CodeBlockData {
  /** Raw source text inside the code block */
  contents: string;
  /** Language identifier for syntax highlighting, or null */
  language: string | null;
  /** Optional name/label for the code block */
  name: string | null;
}

/**
 * Data for a `[[collapsible]]` block.
 *
 * @group Block Elements
 */
export interface CollapsibleData {
  elements: Element[];
  attributes: AttributeMap;
  /** Whether the block starts in the expanded state */
  "start-open": boolean;
  /** Custom text for the "show" toggle, or null for default */
  "show-text": string | null;
  /** Custom text for the "hide" toggle, or null for default */
  "hide-text": string | null;
  /** Whether to show the toggle at the top */
  "show-top": boolean;
  /** Whether to show the toggle at the bottom */
  "show-bottom": boolean;
}

// ---------------------------------------------------------------------------
// Module types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all `[[module ...]]` block types.
 *
 * Known modules have fully typed fields; unknown modules fall back to
 * `{ module: "unknown" }` with raw arguments preserved.
 *
 * @group Module Types
 */
export type Module =
  | {
      /** Unrecognized module — preserves raw arguments for pass-through */
      module: "unknown";
      name: string;
      arguments: AttributeMap;
      body?: string;
    }
  | {
      /** `[[module Backlinks]]` — lists pages that link to a given page */
      module: "backlinks";
      /** Target page, or null for the current page */
      page: string | null;
    }
  | {
      /** `[[module Categories]]` — lists site categories */
      module: "categories";
      /** Whether to include categories marked as hidden */
      "include-hidden": boolean;
    }
  | {
      /** `[[module Join]]` — site membership join button */
      module: "join";
      "button-text": string | null;
      attributes: AttributeMap;
    }
  | {
      /** `[[module PageTree]]` — hierarchical page tree */
      module: "page-tree";
      /** Root page, or null for the site root */
      root: string | null;
      "show-root": boolean;
      /** Max depth, or null for unlimited */
      depth: number | null;
    }
  | {
      /** `[[module Rate]]` — page rating widget */
      module: "rate";
    }
  | {
      /** `[[module TagCloud]]` — weighted cloud of page tags */
      module: "tag-cloud";
      /** Numeric part of the font size for the lightest-weighted tag */
      "min-font-size": number;
      /** Numeric part of the font size for the heaviest-weighted tag */
      "max-font-size": number;
      /** Unit shared by both font sizes (lowercase) */
      "font-size-unit": CssLengthUnit;
      /** RGB components for the lightest-weighted tag */
      "min-color": [number, number, number];
      /** RGB components for the heaviest-weighted tag */
      "max-color": [number, number, number];
      /** Normalized link target prefix, always ending with `/tag/` */
      target: string;
      /** Maximum number of tags to display */
      limit: number;
      /** Category filter, or null for all categories */
      category: string | null;
    }
  | {
      /** `[[module ListUsers]]` — user listing with template body */
      module: "list-users";
      /** User selector expression (e.g. `"."` for current user) */
      users: string;
      /** Template body with `%%variable%%` placeholders */
      body?: string;
      attributes: AttributeMap;
    }
  | {
      /**
       * `[[module ListPages]]` — the most complex module.
       * Queries pages by various criteria and renders each through a template body.
       */
      module: "list-pages";
      // -- Selection criteria --
      category?: string;
      tags?: string;
      parent?: string;
      "link-to"?: string;
      "created-by"?: string;
      "created-at"?: string;
      "updated-at"?: string;
      rating?: string;
      votes?: string;
      name?: string;
      fullname?: string;
      range?: string;
      pagetype?: string;
      // -- Pagination --
      offset?: number;
      limit?: number;
      "per-page"?: number;
      // -- Ordering --
      order?: string;
      // -- Display options --
      reverse: boolean;
      separate: boolean;
      wrapper: boolean;
      "prepend-line"?: string;
      "append-line"?: string;
      // -- RSS options --
      rss?: string;
      "rss-description"?: string;
      "rss-home"?: string;
      "rss-limit"?: number;
      "rss-only": boolean;
      // -- Advanced options --
      /** Prefix for URL path parameters (HPC support) */
      "url-attr-prefix"?: string;
      /** Template body with `%%variable%%` placeholders */
      body?: string;
      attributes: AttributeMap;
    };

// ---------------------------------------------------------------------------
// Embed types
// ---------------------------------------------------------------------------

/**
 * Inline embed from `[[embed]]` syntax (not `[[embed]]...[[/embed]]` blocks).
 * Supports a fixed set of providers.
 *
 * @group Embed Types
 */
export type Embed =
  | { embed: "youtube"; data: { "video-id": string } }
  | { embed: "vimeo"; data: { "video-id": string } }
  | { embed: "github-gist"; data: { username: string; hash: string } }
  | { embed: "gitlab-snippet"; data: { "snippet-id": string } };

// ---------------------------------------------------------------------------
// Miscellaneous value types
// ---------------------------------------------------------------------------

/**
 * Parsed `[[date]]` value with timezone.
 *
 * @group Value Types
 */
export interface DateItem {
  /** Unix timestamp (seconds) */
  timestamp: number;
  /** IANA timezone identifier */
  timezone: string;
}

/**
 * Direction for `[[f<]]`, `[[f>]]`, or `[[f=]]` (clear-float).
 *
 * @group Value Types
 */
export type ClearFloat = "left" | "right" | "both";

// ---------------------------------------------------------------------------
// Named data types for Element variants
// ---------------------------------------------------------------------------

/**
 * Data for `[[a]]` anchor element.
 *
 * @group Element Data
 */
export interface AnchorData {
  target: AnchorTarget | null;
  attributes: AttributeMap;
  elements: Element[];
}

/**
 * Data for link elements (`[[[page]]]`, `[http://...]`, etc.).
 *
 * @group Element Data
 */
export interface LinkData {
  type: LinkType;
  link: LinkLocation;
  /** Extra path segment (e.g. anchor fragment) */
  extra: string | null;
  label: LinkLabel;
  target: AnchorTarget | null;
}

/**
 * Data for `[[image]]` elements.
 *
 * @group Element Data
 */
export interface ImageData {
  source: ImageSource;
  /** If set, the image becomes a clickable link */
  link: LinkLocation | null;
  alignment: FloatAlignment | null;
  attributes: AttributeMap;
}

/**
 * Image size keyword accepted by `[[gallery]]`.
 * Invalid or missing values fall back to `"thumbnail"` at parse time,
 * matching the Wikidot renderer. Renderers use the keyword as a display
 * constraint; it does not imply creation of a resized image asset.
 *
 * @group Element Data
 */
export type GallerySize = "small" | "medium" | "thumbnail" | "square" | "original";

/**
 * Sort order for auto-collected gallery files, normalized at parse time.
 * Deprecated Wikidot aliases (`nameDesc`, `dateAdded`, `dateAddedDesc`) and
 * the ListPages-style `"... desc desc"` forms are folded into these four
 * values. Only meaningful for the content-less (auto) form.
 *
 * @group Element Data
 */
export type GalleryOrder = "name" | "name desc" | "created_at" | "created_at desc";

/**
 * A single `: source link="..." alt="..."` entry inside `[[gallery]]`.
 *
 * @group Element Data
 */
export interface GalleryItem {
  /**
   * Raw image source string with any leading `*` removed.
   * Classification follows the Wikidot rules and happens at render time:
   * a source containing `://` is external, one containing `/` refers to
   * another page's file, anything else is a file on the current page.
   */
  source: string;
  /**
   * Link target with any leading `*` removed, or null when the item has no
   * `link` attribute.
   */
  link: string | null;
  /** Alternative text for the image, or null when no `alt` attribute is given */
  alt: string | null;
  /** true if the link opens in a new window (`*` prefix on source or link) */
  newWindow: boolean;
}

/**
 * Body of a `[[gallery]]` element.
 *
 * - `"items"` — the content form with explicit `: source` lines.
 *   `items` is always non-empty: the content form requires at least one
 *   line to parse.
 * - `"auto"` — the content-less form, which shows the current page's image
 *   attachments. `files` is null until data resolution fills it with the
 *   attachment filenames (already sorted by the gallery's `order`).
 *
 * @group Element Data
 */
export type GalleryContent =
  | { type: "items"; items: GalleryItem[] }
  | { type: "auto"; files: string[] | null };

/**
 * Data for `[[gallery]]` elements.
 *
 * @group Element Data
 */
export interface GalleryData {
  size: GallerySize;
  /** Sort order for auto-collected files (parse-time normalized) */
  order: GalleryOrder;
  /** false when `viewer="no"`/`"false"` disables the lightbox */
  viewer: boolean;
  content: GalleryContent;
}

/**
 * Data for `[[toc]]` (table of contents) elements.
 *
 * @group Element Data
 */
export interface TableOfContentsData {
  attributes: AttributeMap;
  align: Alignment | null;
}

/**
 * Resolved pagination state and navigation targets.
 *
 * @group Element Data
 */
export interface PagerData {
  currentPage: number;
  totalPages: number;
  /** Ascending targets, including the current page, its neighbors, and both ends. */
  pages: { page: number; href: string }[];
}

/**
 * Data for `[[footnoteblock]]` elements.
 *
 * @group Element Data
 */
export interface FootnoteBlockData {
  /** Custom title for the footnote section */
  title: string | null;
  /** If true, the block is hidden (footnotes rendered inline instead) */
  hide?: boolean;
}

/**
 * Data for `[[bibcite label]]` (bibliography citation) elements.
 * Renders as a numbered reference link in the text.
 *
 * @group Element Data
 */
export interface BibliographyCiteData {
  /** Citation key that matches an entry in `[[bibliography]]` */
  label: string;
  /** Whether to render the citation number in brackets */
  brackets: boolean;
}

/**
 * Data for `[[bibliography]]` block elements.
 * Collects all cited entries and renders as a reference list.
 *
 * @group Element Data
 */
export interface BibliographyBlockData {
  /** Definition list entries (`: label : description`) */
  entries: DefinitionListItem[];
  /** Custom section title, or null for default */
  title: string | null;
  /** If true, the block is hidden (for inline citation rendering) */
  hide: boolean;
}

/**
 * Data for `[[user name]]` elements.
 *
 * @group Element Data
 */
export interface UserData {
  name: string;
  /** Whether to show the user's avatar alongside the name */
  "show-avatar": boolean;
}

/**
 * Data for `[[date timestamp]]` elements.
 *
 * @group Element Data
 */
export interface DateData {
  value: DateItem;
  /** strftime-style format string, or null for default */
  format: string | null;
  /** Whether to show elapsed time in a tooltip on hover */
  hover: boolean;
}

/**
 * Data for `##color|text##` inline color syntax.
 *
 * @group Element Data
 */
export interface ColorData {
  /** CSS color value (name, hex, rgb, etc.) */
  color: string;
  elements: Element[];
}

/**
 * Data for `[[math label]]` block math (LaTeX).
 *
 * @group Element Data
 */
export interface MathData {
  /** Optional equation label for cross-references */
  name: string | null;
  /** Raw LaTeX source */
  "latex-source": string;
}

/**
 * Data for `[[$ ... $]]` inline math (LaTeX).
 *
 * @group Element Data
 */
export interface MathInlineData {
  /** Raw LaTeX source */
  "latex-source": string;
}

/**
 * Data for `[[html]]` block elements.
 * Contains raw HTML that is sanitized at render time.
 *
 * @group Element Data
 */
export interface HtmlData {
  /** Raw HTML content */
  contents: string;
  /** Optional `<style>` content extracted from the HTML */
  style?: string;
}

/**
 * Data for `[[embed]]...[[/embed]]` block elements.
 * Contains raw HTML that is validated against an allowlist at render time.
 * Unlike the `html` element, `embed-block` is paragraph-safe.
 *
 * @group Element Data
 */
export interface EmbedBlockData {
  /** Raw HTML content */
  contents: string;
}

/**
 * Data for `[[iframe url]]` elements.
 *
 * @group Element Data
 */
export interface IframeData {
  url: string;
  attributes: AttributeMap;
}

/**
 * Data for `[[include page]]` elements.
 * After resolution via `resolveIncludes()`, `elements` is populated
 * with the included page's parsed content.
 *
 * @group Element Data
 */
export interface IncludeData {
  /** Whether this include appeared in an inline (paragraph-safe) context */
  "paragraph-safe": boolean;
  /** Variables passed to the included page (`key=value` pairs) */
  variables: VariableMap;
  /** Target page reference */
  location: PageRef;
  /** Parsed content of the included page (empty before resolution) */
  elements: Element[];
}

/**
 * Data for `[[iftags]]` conditional blocks.
 * Content is shown/hidden based on the current page's tags.
 *
 * @group Element Data
 */
export interface IfTagsData {
  /** Tag condition expression (e.g. `"+scp -joke"`) */
  condition: string;
  elements: Element[];
}

/**
 * Data for `[[#expr expression]]` inline expressions.
 * The expression is stored as a string and evaluated at render time.
 *
 * @group Element Data
 */
export interface ExprData {
  expression: string;
}

/**
 * Data for `[[#if value | then | else]]` conditionals.
 * Simple truthy check — false values: `"false"`, `"null"`, `""`, `"0"`.
 *
 * @group Element Data
 */
export interface IfCondData {
  condition: string;
  then: Element[];
  else: Element[];
}

/**
 * Data for `[[#ifexpr expression | then | else]]` conditionals.
 * Evaluates the expression numerically and branches on the result.
 *
 * @group Element Data
 */
export interface IfExprData {
  expression: string;
  then: Element[];
  else: Element[];
}

// ---------------------------------------------------------------------------
// Element core types
// ---------------------------------------------------------------------------

/**
 * Maps each element tag name to its data type.
 *
 * `void` means the element carries no data property (e.g. `line-break`).
 *
 * Declared as `type` (not `interface`) to prevent accidental declaration merging.
 *
 * @group Core
 */
export type ElementDataMap = {
  container: ContainerData;
  module: Module;
  text: string;
  raw: string;
  variable: string;
  email: string;
  table: TableData;
  "tab-view": TabData[];
  anchor: AnchorData;
  "anchor-name": string;
  link: LinkData;
  image: ImageData;
  gallery: GalleryData;
  list: ListData;
  "definition-list": DefinitionListItem[];
  collapsible: CollapsibleData;
  "table-of-contents": TableOfContentsData;
  pager: PagerData;
  footnote: void;
  "footnote-ref": number;
  "footnote-block": FootnoteBlockData;
  "bibliography-cite": BibliographyCiteData;
  "bibliography-block": BibliographyBlockData;
  user: UserData;
  date: DateData;
  color: ColorData;
  code: CodeBlockData;
  math: MathData;
  "math-inline": MathInlineData;
  "equation-reference": string;
  embed: Embed;
  "embed-block": EmbedBlockData;
  html: HtmlData;
  iframe: IframeData;
  include: IncludeData;
  style: string;
  "line-break": void;
  "line-breaks": number;
  "clear-float": ClearFloat;
  "horizontal-rule": void;
  "content-separator": void;
  "if-tags": IfTagsData;
  expr: ExprData;
  if: IfCondData;
  ifexpr: IfExprData;
};

/**
 * Union of all valid element tag names.
 *
 * @group Core
 */
export type ElementName = keyof ElementDataMap;

/**
 * Resolves the data type for a given element tag name.
 *
 * @group Core
 */
export type ElementData<K extends ElementName> = ElementDataMap[K];

/**
 * Resolves the full element shape for a given tag name.
 * Elements with `void` data omit the `data` property entirely.
 *
 * @group Core
 */
export type ElementOf<K extends ElementName> = ElementDataMap[K] extends void
  ? { element: K }
  : { element: K; data: ElementDataMap[K] };

/**
 * A single AST node. Tagged union over all element types.
 *
 * Use `element.element` to discriminate, then access `element.data`
 * with the appropriate type.
 *
 * @example
 * ```ts
 * if (el.element === "text") {
 *   console.log(el.data); // string
 * } else if (el.element === "container") {
 *   console.log(el.data.type); // ContainerType
 * }
 * ```
 *
 * @group Core
 */
export type Element = {
  [K in ElementName]: ElementOf<K>;
}[ElementName];

/**
 * Table-of-contents entry collected during parsing.
 * Used internally to build the TOC sidebar.
 *
 * @group Core
 */
export interface TocEntry {
  /** Heading nesting level (1-6) */
  level: number;
  /** Plain-text heading content */
  text: string;
}

/**
 * Root of the parsed AST.
 *
 * Besides the main `elements` array, the tree may carry extracted
 * side-channel data (TOC, styles, code blocks, footnotes) that is
 * collected during parsing and used at render time.
 *
 * @group Core
 */
export interface SyntaxTree {
  /** Top-level elements of the document */
  elements: Element[];
  /** Generated table-of-contents entries (if any headings have `has-toc: true`) */
  "table-of-contents"?: Element[];
  /** CSS from `[[module CSS]]` blocks */
  styles?: string[];
  /** Raw HTML from `[[html]]` blocks (rendered in sandboxed iframes) */
  "html-blocks"?: string[];
  /** Code blocks extracted for deferred syntax highlighting */
  "code-blocks"?: CodeBlockData[];
  /** Footnote content arrays, indexed by footnote number */
  footnotes?: Element[][];
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a text element.
 *
 * @group Factories
 */
export function text(value: string): Element {
  return { element: "text", data: value };
}

/**
 * Create a container element with the given type and children.
 *
 * @group Factories
 */
export function container(
  type: ContainerType,
  elements: Element[],
  attributes: AttributeMap = {},
): Element {
  return {
    element: "container",
    data: { type, attributes, elements },
  };
}

/**
 * Create a paragraph container.
 *
 * @group Factories
 */
export function paragraph(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("paragraph", elements, attributes);
}

/**
 * Create a bold (`**...**`) container.
 *
 * @group Factories
 */
export function bold(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("bold", elements, attributes);
}

/**
 * Create an italics (`//...//`) container.
 *
 * @group Factories
 */
export function italics(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("italics", elements, attributes);
}

/**
 * Create a heading (`+ ...` through `++++++ ...`) container.
 *
 * @param level - Heading depth (1-6)
 * @param elements - Heading content
 * @param hasToc - Whether to include in the table of contents (default: true)
 * @param attributes - Optional HTML attributes
 *
 * @group Factories
 */
export function heading(
  level: HeadingLevel,
  elements: Element[],
  hasToc = true,
  attributes: AttributeMap = {},
): Element {
  return container({ header: { level, "has-toc": hasToc } }, elements, attributes);
}

/**
 * Create a line-break element.
 *
 * @group Factories
 */
export function lineBreak(): Element {
  return { element: "line-break" };
}

/**
 * Create a horizontal rule (`----`) element.
 *
 * @group Factories
 */
export function horizontalRule(): Element {
  return { element: "horizontal-rule" };
}

/**
 * Create a link element.
 *
 * @param linkLocation - Destination (URL string or {@link PageRef})
 * @param label - Display label
 * @param options - Optional type, extra path, and target overrides
 *
 * @group Factories
 */
export function link(
  linkLocation: LinkLocation,
  label: LinkLabel,
  options: {
    type?: LinkType;
    extra?: string | null;
    target?: AnchorTarget | null;
  } = {},
): Element {
  return {
    element: "link",
    data: {
      type: options.type ?? (typeof linkLocation === "string" ? "direct" : "page"),
      link: linkLocation,
      extra: options.extra ?? null,
      label,
      target: options.target ?? null,
    },
  };
}

/**
 * Create a list element.
 *
 * @group Factories
 */
export function list(type: ListType, items: ListItem[], attributes: AttributeMap = {}): Element {
  return {
    element: "list",
    data: { type, attributes, items },
  };
}

/**
 * Create a list item containing inline elements.
 *
 * @group Factories
 */
export function listItemElements(elements: Element[], attributes: AttributeMap = {}): ListItem {
  return {
    "item-type": "elements",
    attributes,
    elements,
  };
}

/**
 * Create a list item containing a nested sub-list.
 *
 * @group Factories
 */
export function listItemSubList(data: ListData): ListItem {
  return {
    "item-type": "sub-list",
    element: "list",
    data,
  };
}

// ---------------------------------------------------------------------------
// Paragraph safety checks
// ---------------------------------------------------------------------------

/**
 * Check whether a container type can appear inside a `<p>` element.
 *
 * Inline formatting (bold, italics, span, etc.) is paragraph-safe.
 * Block-level structures (div, blockquote, heading, etc.) are not.
 *
 * @group Utilities
 */
export function isContainerTypeParagraphSafe(type: ContainerType): boolean {
  if (isHeaderType(type)) return false;
  if (isAlignType(type)) return false;
  // String container types
  switch (type) {
    case "bold":
    case "italics":
    case "underline":
    case "superscript":
    case "subscript":
    case "strikethrough":
    case "monospace":
    case "span":
    case "size":
      return true;
    case "div":
    case "blockquote":
    case "paragraph":
    case "heading":
    case "collapsible":
    case "definition-list":
    case "definition-list-item":
    case "definition-list-key":
    case "definition-list-value":
    case "table-row":
    case "table-cell":
      return false;
    default:
      // Unknown types are treated as not paragraph-safe for safety
      return false;
  }
}

/**
 * Check whether an element can appear inside a `<p>` element.
 *
 * Performs a surface-level check on the element tag (and container type
 * for containers). Does not recurse into child elements.
 *
 * Used by the parser to decide whether to wrap adjacent inline elements
 * in a paragraph or leave them as block-level siblings.
 *
 * @group Utilities
 */
export function isParagraphSafe(element: Element): boolean {
  switch (element.element) {
    case "container": {
      const data = element.data as ContainerData;
      return isContainerTypeParagraphSafe(data.type);
    }
    case "module":
      return false;
    case "text":
    case "raw":
    case "variable":
    case "email":
      return true;
    case "table":
      return false;
    case "tab-view":
      return false;
    case "anchor":
    case "anchor-name":
    case "link":
      return true;
    case "image":
      return true;
    case "list":
      return false;
    case "definition-list":
      return false;
    case "collapsible":
      return false;
    case "table-of-contents":
      return false;
    case "footnote":
      return true;
    case "footnote-ref":
      return true;
    case "footnote-block":
      return false;
    case "bibliography-cite":
      return true;
    case "bibliography-block":
      return false;
    case "user":
      return true;
    case "date":
      return true;
    case "color":
      return true;
    case "code":
      return false;
    case "math":
      return false;
    case "math-inline":
      return true;
    case "embed":
      return false;
    case "embed-block":
      return true;
    case "html":
    case "iframe":
      return false;
    case "include": {
      const data = element.data as IncludeData;
      return data["paragraph-safe"];
    }
    case "style":
      return false;
    case "line-break":
    case "line-breaks":
      return true;
    case "clear-float":
      return false;
    case "horizontal-rule":
      return false;
    case "content-separator":
      return false;
    case "if-tags":
      return false;
    case "expr":
    case "if":
    case "ifexpr":
      return true;
    default:
      return false;
  }
}
