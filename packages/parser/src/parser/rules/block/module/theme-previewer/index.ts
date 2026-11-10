/**
 *
 * Parser rule for the Wikidot `[[module ThemePreviewer]]` block.
 *
 * Wikidot replaces the page's theme stylesheet imports with the stylesheets
 * of the previewed theme. The parser keeps the theme URL on the AST node;
 * the renderer emits nothing, and hosts swap their theme CSS using
 * {@link findThemePreviewerUrl} (also exposed as `themeUrl` by
 * `processWikitext`). Like `[[module CSS]]`, the URL is only exposed when
 * `allowStyleElements` is enabled. Wikidot's `theme_id` parameter and theme selector UI
 * need the site's theme list and are not supported.
 *
 * @example
 * ```
 * [[module ThemePreviewer theme_url="https://example.com/theme.css"]]
 * ```
 *
 * @module
 */

import type { Element, Module, WikitextSettings } from "@wdprlib/ast";
import type { ModuleRule } from "../types";
import { walkElements } from "../walk";

export type ThemePreviewerModuleData = Extract<Module, { module: "theme-previewer" }>;

/**
 * Module rule for `[[module ThemePreviewer]]`.
 */
export const themePreviewerModuleRule: ModuleRule = {
  name: "module-theme-previewer",
  acceptsNames: ["themepreviewer"],
  hasBody: false,

  parse(_ctx, _pos, args): ThemePreviewerModuleData {
    return { module: "theme-previewer", "theme-url": normalizeThemeUrl(args.theme_url) };
  },
};

/**
 * Accept only URLs a stylesheet link can safely point to: http(s),
 * protocol-relative and root-relative. Everything else becomes null.
 */
function normalizeThemeUrl(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url || /\s/.test(url) || !/^(?:https?:\/\/|\/)./i.test(url)) return null;
  try {
    // Reject malformed URLs such as `https://[` that a stylesheet link cannot load.
    new URL(url, "https://base.invalid/");
  } catch {
    return null;
  }
  return url;
}

/**
 * Return the theme URL of the first `[[module ThemePreviewer]]` with a
 * valid `theme_url`, or null when the page previews no theme.
 *
 * A theme stylesheet is page-wide author CSS, so this follows the same
 * `allowStyleElements` setting as `[[module CSS]]` and returns null when
 * it is disabled.
 */
export function findThemePreviewerUrl(
  elements: Element[],
  settings: Pick<WikitextSettings, "allowStyleElements">,
): string | null {
  if (!settings.allowStyleElements) return null;
  let found: string | null = null;
  walkElements(elements, (element) => {
    if (found !== null) return;
    if (element.element === "module" && element.data.module === "theme-previewer") {
      found = element.data["theme-url"];
    }
  });
  return found;
}
