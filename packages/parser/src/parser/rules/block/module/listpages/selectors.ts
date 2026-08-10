import type { PageData } from "./types/external-data";
import type {
  NormalizedCategory,
  NormalizedListPagesQuery,
  NormalizedTags,
} from "./types/normalized-query";

type SelectorPage = Pick<PageData, "category" | "tags" | "hiddenTags">;
type CurrentPage = { category: string; tags: readonly string[] };

export function matchesListPagesSelectors(
  page: SelectorPage,
  query: Pick<NormalizedListPagesQuery, "category" | "tags">,
  currentPage: CurrentPage,
): boolean {
  return (
    matchesCategory(page.category, query.category, currentPage.category) &&
    matchesTags(page, query.tags, currentPage)
  );
}

function matchesCategory(
  category: string,
  selector: NormalizedCategory | undefined,
  currentCategory: string,
): boolean {
  if (!selector) return category === currentCategory;
  if (selector.exclude.includes(category)) return false;

  const hasPositiveSelector = selector.all || selector.current || selector.include.length > 0;
  return (
    !hasPositiveSelector ||
    selector.all ||
    (selector.current && category === currentCategory) ||
    selector.include.includes(category)
  );
}

function matchesTags(
  page: Pick<SelectorPage, "tags" | "hiddenTags">,
  selector: NormalizedTags | undefined,
  currentPage: Pick<CurrentPage, "tags">,
): boolean {
  if (!selector) return true;

  const allTags = new Set([...page.tags, ...page.hiddenTags]);
  if (selector.all.some((tag) => !allTags.has(tag))) return false;
  if (selector.any.length > 0 && !selector.any.some((tag) => allTags.has(tag))) return false;
  if (selector.none.some((tag) => allTags.has(tag))) return false;

  if (selector.special === "none") return allTags.size === 0;
  const currentTags = new Set(currentPage.tags.filter((tag) => !tag.startsWith("_")));
  if (selector.special === "same-visible") {
    return page.tags.some((tag) => currentTags.has(tag));
  }
  if (selector.special === "same-all") {
    return setsEqual(new Set(page.tags), currentTags);
  }
  return true;
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}
