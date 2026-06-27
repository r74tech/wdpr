import type { PageData } from "../../types";

/**
 * Split content by ==== separators.
 *
 * Wikidot uses preg_split('/^([=]{4,})$/m', $source); %%content{n}%%
 * references sections[n-1] (1-indexed).
 */
export function splitContentSections(content: string): string[] {
  return content.split(/^={4,}$/m).map((section) => section.trim());
}

/**
 * Extract a summary from page content.
 */
export function getSummary(page: PageData): string {
  if (page.content) {
    const sections = splitContentSections(page.content);
    if (sections.length > 1) {
      return sections[0]?.trim() ?? "";
    }
  }
  return getFirstParagraph(page.content);
}

/**
 * Extract the first paragraph from wikitext content.
 */
export function getFirstParagraph(content?: string): string {
  if (!content) return "";

  const stripped = content
    .replace(/^(\+{1,6}) (.*)/gm, "")
    .replace(/^\[\[toc(\s[^\]]+)?\]\]/gim, "")
    .replace(/^\[\[\/?div(\s[^\]]+)?\]\]/gim, "")
    .replace(/^\[\[\/?module(\s[^\]]+)?\]\]/gim, "")
    .trim();

  const paragraphs = stripped.split(/\n{2,}/);
  return paragraphs[0]?.trim() ?? "";
}
