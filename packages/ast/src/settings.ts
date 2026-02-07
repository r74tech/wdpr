/**
 * Wikitext parsing/rendering mode.
 * Each mode has different default settings for syntax availability.
 */
export type WikitextMode = "page" | "draft" | "forum-post" | "direct-message";

/**
 * Settings that control parser and renderer behavior based on context.
 */
export interface WikitextSettings {
  /** Operating mode */
  mode: WikitextMode;
  /**
   * Whether page-contextual syntax is permitted.
   * Controls: include, module, table-of-contents.
   */
  enablePageSyntax: boolean;
  /**
   * Whether local file paths (file1, file2, file3) are permitted for images.
   * Disable in contexts without a "local" page (forum posts, direct messages).
   */
  allowLocalPaths: boolean;
  /**
   * Whether element IDs should be stable sequential values.
   * When false, IDs are randomized to prevent collisions
   * when multiple rendered fragments appear on the same page.
   */
  useTrueIds: boolean;
}

/**
 * Create WikitextSettings with defaults for the given mode.
 */
export function createSettings(mode: WikitextMode): WikitextSettings {
  switch (mode) {
    case "page":
      return { mode, enablePageSyntax: true, allowLocalPaths: true, useTrueIds: true };
    case "draft":
      return { mode, enablePageSyntax: true, allowLocalPaths: true, useTrueIds: false };
    case "forum-post":
    case "direct-message":
      return { mode, enablePageSyntax: false, allowLocalPaths: false, useTrueIds: false };
  }
}

/** Default settings (page mode) */
export const DEFAULT_SETTINGS: WikitextSettings = createSettings("page");
