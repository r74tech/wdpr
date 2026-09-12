/**
 * Split content by ==== separators.
 *
 * Wikidot uses preg_split('/^([=]{4,})$/m', $source); %%content{n}%%
 * references sections[n-1] (1-indexed).
 */
export function splitContentSections(content: string): string[] {
  return content.split(/^={4,}$/m).map((section) => section.trim());
}
