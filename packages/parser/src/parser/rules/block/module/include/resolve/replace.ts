import { parseIncludeDirective, substituteVariables } from "../directive";
import type { AsyncIncludeFetcher, IncludeFetcher } from "./types";

/**
 * Replace a single include match with its fetched + variable-substituted content.
 * Returns the replacement text for a single directive's `inner` content, or
 * null when the substituted content would exceed `maxLength`.
 */
export function replaceOneInclude(
  inner: string,
  fetcher: IncludeFetcher,
  maxLength: number,
): string | null {
  const { location, assignments } = parseIncludeDirective(inner);
  const content = fetcher(location);
  if (content === null) {
    return missingIncludeError(location.page);
  }
  return substituteVariables(content, assignments, maxLength);
}

export async function replaceOneIncludeAsync(
  inner: string,
  fetcher: AsyncIncludeFetcher,
  maxLength: number,
): Promise<string | null> {
  const { location, assignments } = parseIncludeDirective(inner);
  const content = await fetcher(location);
  if (content === null) {
    return missingIncludeError(location.page);
  }
  return substituteVariables(content, assignments, maxLength);
}

function missingIncludeError(page: string): string {
  return `[[div class="error-block"]]\nPage to be included "${page}" cannot be found!\n[[/div]]`;
}
