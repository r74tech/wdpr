/**
 * HTML renderer for the Wikidot AST.
 *
 * Takes a `SyntaxTree` produced by `@wdprlib/parser` and serialises
 * it to an HTML string. Page context, user resolution, and security
 * settings (embed allowlists, iframe sandboxing) are configurable via
 * {@link RenderOptions}.
 *
 * ```ts
 * import { parse } from "@wdprlib/parser";
 * import { renderToHtml } from "@wdprlib/render";
 *
 * const html = renderToHtml(parse("**hello**"));
 * // => "<p><strong>hello</strong></p>"
 * ```
 *
 * @packageDocumentation
 */

export { renderToHtml } from "./render";
export { renderWikitext } from "./pipeline";
export type {
  RenderableWikitextDocument,
  RenderedHtmlBlock,
  RenderWikitextOptions,
  RenderWikitextResolvers,
  WikitextRenderArtifacts,
  WikitextRenderResult,
} from "./pipeline";
export type {
  RenderOptions,
  RenderResolvers,
  PageContext,
  PageFileData,
  ResolvedUser,
} from "./types";
export { DEFAULT_EMBED_ALLOWLIST } from "./elements/embed-block";

// Wikitext settings (re-exported from @wdprlib/ast)
export type { WikitextMode, WikitextSettings } from "@wdprlib/ast";
export { createSettings, DEFAULT_SETTINGS } from "@wdprlib/ast";
