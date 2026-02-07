export { renderToHtml } from "./render";
export type { RenderOptions, RenderResolvers, PageContext, ResolvedUser } from "./types";
export { DEFAULT_EMBED_ALLOWLIST } from "./elements/embed-block";

// Wikitext settings (re-exported from @wdprlib/ast)
export type { WikitextMode, WikitextSettings } from "@wdprlib/ast";
export { createSettings, DEFAULT_SETTINGS } from "@wdprlib/ast";
