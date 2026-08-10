import { describe, expect, test } from "bun:test";
import { definePageData, type PageData } from "@wdprlib/parser";

const createdAt = new Date("2026-08-01T00:00:00Z");
const updatedAt = new Date("2026-08-02T00:00:00Z");

describe("definePageData", () => {
  test("derives the default category and fills safe defaults", () => {
    expect(
      definePageData({
        fullname: "start",
        title: "Start",
        createdAt,
        updatedAt,
        tags: ["docs"],
      }),
    ).toEqual({
      name: "start",
      category: "_default",
      fullname: "start",
      title: "Start",
      createdAt,
      updatedAt,
      tags: ["docs"],
      hiddenTags: [],
      children: 0,
      comments: 0,
      size: 0,
      rating: 0,
      ratingVotes: 0,
      revisions: 0,
    });
  });

  test("derives a category and preserves colons in the page name", () => {
    const page = definePageData({
      fullname: "docs:start:child",
      title: "Child",
      createdAt,
      updatedAt,
      tags: [],
    });

    expect(page.category).toBe("docs");
    expect(page.name).toBe("start:child");
  });

  test("preserves explicit PageData fields and overrides", () => {
    const full: PageData = {
      name: "custom-name",
      category: "custom-category",
      fullname: "docs:start",
      title: "Start",
      createdAt,
      updatedAt,
      tags: ["docs"],
      hiddenTags: ["_staff"],
      children: 1,
      comments: 2,
      size: 3,
      rating: 4,
      ratingVotes: 5,
      revisions: 6,
      content: "source",
    };

    expect(definePageData(full)).toEqual(full);
  });

  test("uses defaults for explicitly undefined optional fields", () => {
    const page = definePageData({
      fullname: "docs:start",
      title: "Start",
      createdAt,
      updatedAt,
      tags: [],
      hiddenTags: undefined,
      rating: undefined,
    });

    expect(page.hiddenTags).toEqual([]);
    expect(page.rating).toBe(0);
  });
});
