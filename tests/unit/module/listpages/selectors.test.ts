import { describe, expect, test } from "bun:test";
import {
  matchesListPagesSelectors,
  normalizeQuery,
  type ListPagesQuery,
  type PageData,
} from "@wdprlib/parser";

type SelectorPage = Pick<PageData, "category" | "tags" | "hiddenTags">;

describe("matchesListPagesSelectors", () => {
  const currentPage = { category: "docs", tags: ["docs", "shared", "_staff"] };

  test.each([
    ["defaults to the current category", { category: "docs", tags: [], hiddenTags: [] }, {}, true],
    [
      "rejects another category by default",
      { category: "news", tags: [], hiddenTags: [] },
      {},
      false,
    ],
    [
      "matches any category selected by *",
      { category: "news", tags: [], hiddenTags: [] },
      { category: "*" },
      true,
    ],
    [
      "excludes current hidden tags from ==",
      { category: "docs", tags: ["shared", "docs"], hiddenTags: [] },
      { tags: "==" },
      true,
    ],
    [
      "applies exclusions together with *",
      { category: "admin", tags: [], hiddenTags: [] },
      { category: "* -admin" },
      false,
    ],
    [
      "combines current and explicit categories",
      { category: "news", tags: [], hiddenTags: [] },
      { category: ". news" },
      true,
    ],
    [
      "uses all categories for exclusion-only selectors",
      { category: "news", tags: [], hiddenTags: [] },
      { category: "-admin" },
      true,
    ],
    [
      "matches any unprefixed tag",
      { category: "docs", tags: ["docs"], hiddenTags: [] },
      { tags: "other docs" },
      true,
    ],
    [
      "requires every +tag",
      { category: "docs", tags: ["docs", "stable"], hiddenTags: [] },
      { tags: "+docs +stable" },
      true,
    ],
    [
      "rejects a missing +tag",
      { category: "docs", tags: ["docs"], hiddenTags: [] },
      { tags: "+docs +stable" },
      false,
    ],
    [
      "rejects any -tag",
      { category: "docs", tags: ["docs", "draft"], hiddenTags: [] },
      { tags: "+docs -draft" },
      false,
    ],
    [
      "matches hidden tags",
      { category: "docs", tags: [], hiddenTags: ["_staff"] },
      { tags: "+_staff" },
      true,
    ],
    [
      "matches - only without tags",
      { category: "docs", tags: [], hiddenTags: [] },
      { tags: "-" },
      true,
    ],
    [
      "matches = for a shared visible tag",
      { category: "docs", tags: ["shared"], hiddenTags: [] },
      { tags: "=" },
      true,
    ],
    [
      "matches == for the exact visible tags",
      { category: "docs", tags: ["shared", "docs"], hiddenTags: [] },
      { tags: "==" },
      true,
    ],
    [
      "combines category and tags",
      { category: "docs", tags: ["docs"], hiddenTags: [] },
      { category: ".", tags: "+docs" },
      true,
    ],
  ] satisfies Array<[string, SelectorPage, ListPagesQuery, boolean]>)(
    "%s",
    (_name, page, query, expected) => {
      expect(matchesListPagesSelectors(page, normalizeQuery(query), currentPage)).toBe(expected);
    },
  );
});
