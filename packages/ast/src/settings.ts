/**
 * Context-dependent settings for the Wikidot parser and renderer.
 *
 * Wikidot content appears in several different contexts — full wiki pages,
 * draft previews, forum posts, and direct messages — each with different
 * security and capability requirements. {@link WikitextSettings} captures
 * those differences so the parser/renderer can enable or disable features
 * accordingly.
 *
 * Use {@link createSettings} to get sane defaults for a given
 * {@link WikitextMode}, then override individual fields as needed.
 *
 * @module
 */

/**
 * The context in which wikitext is being parsed and rendered.
 *
 * Each mode implies a different set of defaults for
 * {@link WikitextSettings}. The modes correspond to the places where
 * user-authored wikitext can appear on a Wikidot site.
 *
 * | Mode               | Page syntax | Local paths | True IDs | Style elements | HTML blocks |
 * |--------------------|:-----------:|:-----------:|:--------:|:--------------:|:-----------:|
 * | `"page"`           | yes         | yes         | yes      | no             | yes         |
 * | `"draft"`          | yes         | yes         | no       | no             | no          |
 * | `"forum-post"`     | no          | no          | no       | no             | no          |
 * | `"direct-message"` | no          | no          | no       | no             | no          |
 *
 * @group Settings
 */
export type WikitextMode = "page" | "draft" | "forum-post" | "direct-message";

/**
 * Controls which parser and renderer features are active.
 *
 * These flags gate syntax availability and rendering behaviour based on the
 * context where the wikitext appears. Construct via {@link createSettings}
 * and override individual fields when non-default behaviour is needed.
 *
 * @group Settings
 */
export interface WikitextSettings {
  /** The context mode this settings object was created for */
  mode: WikitextMode;

  /**
   * Whether page-contextual syntax is permitted.
   *
   * When `true`, the parser recognises `[[include]]`, `[[module]]`, and
   * `[[toc]]` blocks. These constructs are meaningful only inside a full
   * wiki page and are disabled in forum posts and direct messages.
   */
  enablePageSyntax: boolean;

  /**
   * Whether local file references (`file1`, `file2`, `file3`) are allowed
   * in image sources.
   *
   * Local files belong to a specific wiki page. In contexts that lack a
   * "current page" — such as forum posts and direct messages — local file
   * references are meaningless and should be rejected.
   */
  allowLocalPaths: boolean;

  /**
   * Whether heading and footnote IDs use stable sequential values
   * (`toc0`, `toc1`, ...) or randomised strings.
   *
   * Stable IDs are appropriate when a single rendered page owns the full
   * document. Randomised IDs prevent collisions when multiple rendered
   * fragments (e.g. a live draft preview) coexist on the same HTML page.
   */
  useTrueIds: boolean;

  /**
   * Whether `[[module CSS]]` blocks are rendered as `<style>` tags.
   *
   * User-authored CSS can break page layout and leak page data, so it is
   * disabled by default in every mode. Callers may explicitly enable it
   * only for trusted CSS.
   */
  allowStyleElements: boolean;

  /**
   * Whether `[[html]]` blocks are recognised by the parser and rendered.
   *
   * HTML blocks embed raw HTML that the renderer serves inside a sandboxed
   * iframe. The capability is meaningful only in contexts that can host
   * the auxiliary iframe URL, so it is disabled in drafts, forum posts,
   * and direct messages.
   *
   * When `false`, the parser still consumes the entire `[[html]]...[[/html]]`
   * span (so the raw body cannot leak as text) but emits no AST node, and
   * the renderer skips any pre-existing `html` element it encounters.
   *
   * Wikidot's legacy `Text_Wiki` keeps `Html` in its `$disable` list by
   * default (`lib/Text_Wiki/Text/Wiki.php` line 145-147), so an authentic
   * Wikidot-compat default would be `false` even in `"page"` mode. wp
   * keeps `"page"` at `true` for now to preserve existing consumers; a
   * future change may align with Wikidot.
   */
  allowHtmlBlocks: boolean;
}

/**
 * Create a {@link WikitextSettings} with sensible defaults for the given mode.
 *
 * See the table on {@link WikitextMode} for which flags each mode enables.
 *
 * @param mode - The context in which wikitext will be parsed
 * @returns A new settings object with defaults for that mode
 *
 * @group Settings
 */
export function createSettings(mode: WikitextMode): WikitextSettings {
  switch (mode) {
    case "page":
      return {
        mode,
        enablePageSyntax: true,
        allowLocalPaths: true,
        useTrueIds: true,
        allowStyleElements: false,
        allowHtmlBlocks: true,
      };
    case "draft":
      return {
        mode,
        enablePageSyntax: true,
        allowLocalPaths: true,
        useTrueIds: false,
        allowStyleElements: false,
        allowHtmlBlocks: false,
      };
    case "forum-post":
    case "direct-message":
      return {
        mode,
        enablePageSyntax: false,
        allowLocalPaths: false,
        useTrueIds: false,
        allowStyleElements: false,
        allowHtmlBlocks: false,
      };
  }
}

/**
 * Pre-built settings for `"page"` mode — the most common context.
 *
 * Equivalent to `createSettings("page")`. Provided as a convenience
 * for call-sites that always operate on full wiki pages.
 *
 * @group Settings
 */
export const DEFAULT_SETTINGS: WikitextSettings = createSettings("page");
