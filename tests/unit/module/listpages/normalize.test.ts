import { describe, test, expect } from "bun:test";
import {
  parseTags,
  parseCategory,
  parseOrder,
  parseParent,
  parseDateSelector,
  parseNumericSelector,
  normalizeQuery,
} from "../../../../packages/parser/src/parser/rules/block/module/listpages/normalize";
import {
  parseUrlParams,
  resolveQuery,
  resolveAndNormalizeQuery,
} from "../../../../packages/parser/src/parser/rules/block/module/listpages/url-resolver";
import type { ListPagesDataRequirement } from "../../../../packages/parser/src/parser/rules/block/module/listpages/types";

describe("parseTags", () => {
  test("parses OR conditions (no prefix)", () => {
    const result = parseTags("fruit vegetable");
    expect(result.any).toEqual(["fruit", "vegetable"]);
    expect(result.all).toEqual([]);
    expect(result.none).toEqual([]);
    expect(result.special).toBeNull();
  });

  test("parses AND conditions (+prefix)", () => {
    const result = parseTags("+fruit +vegetable");
    expect(result.all).toEqual(["fruit", "vegetable"]);
    expect(result.any).toEqual([]);
    expect(result.none).toEqual([]);
  });

  test("parses NOT conditions (-prefix)", () => {
    const result = parseTags("-admin -draft");
    expect(result.none).toEqual(["admin", "draft"]);
    expect(result.any).toEqual([]);
    expect(result.all).toEqual([]);
  });

  test("parses mixed conditions", () => {
    const result = parseTags("+fruit -admin vegetable");
    expect(result.all).toEqual(["fruit"]);
    expect(result.none).toEqual(["admin"]);
    expect(result.any).toEqual(["vegetable"]);
  });

  test("parses special selector: same-visible (=)", () => {
    const result = parseTags("=");
    expect(result.special).toBe("same-visible");
  });

  test("parses special selector: same-all (==)", () => {
    const result = parseTags("==");
    expect(result.special).toBe("same-all");
  });

  test("parses special selector: none (-)", () => {
    const result = parseTags("-");
    expect(result.special).toBe("none");
  });

  test("parses = mixed with other tags", () => {
    const result = parseTags("= +fruit");
    expect(result.special).toBe("same-visible");
    expect(result.all).toEqual(["fruit"]);
  });

  test("handles comma-separated tags", () => {
    const result = parseTags("fruit, vegetable, +meat");
    expect(result.any).toEqual(["fruit", "vegetable"]);
    expect(result.all).toEqual(["meat"]);
  });

  test("handles semicolon-separated tags", () => {
    const result = parseTags("fruit; vegetable");
    expect(result.any).toEqual(["fruit", "vegetable"]);
  });

  test("handles empty string", () => {
    const result = parseTags("");
    expect(result.any).toEqual([]);
    expect(result.all).toEqual([]);
    expect(result.none).toEqual([]);
    expect(result.special).toBeNull();
  });

  test("handles whitespace only", () => {
    const result = parseTags("   ");
    expect(result.any).toEqual([]);
  });
});

describe("parseCategory", () => {
  test("parses single category", () => {
    const result = parseCategory("blog");
    expect(result.include).toEqual(["blog"]);
    expect(result.exclude).toEqual([]);
    expect(result.all).toBe(false);
    expect(result.current).toBe(false);
  });

  test("parses multiple categories", () => {
    const result = parseCategory("blog news article");
    expect(result.include).toEqual(["blog", "news", "article"]);
  });

  test("parses all categories (*)", () => {
    const result = parseCategory("*");
    expect(result.all).toBe(true);
    expect(result.include).toEqual([]);
  });

  test("parses current category (.)", () => {
    const result = parseCategory(".");
    expect(result.current).toBe(true);
    expect(result.include).toEqual([]);
  });

  test("parses excluded categories (-prefix)", () => {
    const result = parseCategory("-admin -system");
    expect(result.exclude).toEqual(["admin", "system"]);
    expect(result.include).toEqual([]);
  });

  test("parses mixed include/exclude", () => {
    const result = parseCategory("blog -admin news");
    expect(result.include).toEqual(["blog", "news"]);
    expect(result.exclude).toEqual(["admin"]);
  });

  test("handles comma-separated categories", () => {
    const result = parseCategory("blog, news, -admin");
    expect(result.include).toEqual(["blog", "news"]);
    expect(result.exclude).toEqual(["admin"]);
  });

  test("converts to lowercase", () => {
    const result = parseCategory("Blog NEWS");
    expect(result.include).toEqual(["blog", "news"]);
  });

  test("handles empty string", () => {
    const result = parseCategory("");
    expect(result.include).toEqual([]);
    expect(result.exclude).toEqual([]);
    expect(result.all).toBe(false);
    expect(result.current).toBe(false);
  });
});

describe("parseOrder", () => {
  test("parses camelCase format: dateCreatedDesc", () => {
    const result = parseOrder("dateCreatedDesc");
    expect(result.field).toBe("created_at");
    expect(result.direction).toBe("desc");
  });

  test("parses camelCase format: titleAsc", () => {
    const result = parseOrder("titleAsc");
    expect(result.field).toBe("title");
    expect(result.direction).toBe("asc");
  });

  test("parses camelCase format: ratingDesc", () => {
    const result = parseOrder("ratingDesc");
    expect(result.field).toBe("rating");
    expect(result.direction).toBe("desc");
  });

  test("parses camelCase format: dateEditedAsc", () => {
    const result = parseOrder("dateEditedAsc");
    expect(result.field).toBe("updated_at");
    expect(result.direction).toBe("asc");
  });

  test("parses space-separated format: created_at desc", () => {
    const result = parseOrder("created_at desc");
    expect(result.field).toBe("created_at");
    expect(result.direction).toBe("desc");
  });

  test("parses space-separated format: title asc", () => {
    const result = parseOrder("title asc");
    expect(result.field).toBe("title");
    expect(result.direction).toBe("asc");
  });

  test("parses space-separated format: updated_at desc", () => {
    const result = parseOrder("updated_at desc");
    expect(result.field).toBe("updated_at");
    expect(result.direction).toBe("desc");
  });

  test("parses pageLengthDesc as size", () => {
    const result = parseOrder("pageLengthDesc");
    expect(result.field).toBe("size");
    expect(result.direction).toBe("desc");
  });

  test("returns default for empty string", () => {
    const result = parseOrder("");
    expect(result.field).toBe("created_at");
    expect(result.direction).toBe("desc");
  });

  test("returns default for unknown field", () => {
    const result = parseOrder("unknownField");
    expect(result.field).toBe("created_at");
    expect(result.direction).toBe("desc");
  });

  test("handles case insensitivity", () => {
    const result = parseOrder("DATECREATEDESC");
    expect(result.field).toBe("created_at");
    expect(result.direction).toBe("desc");
  });
});

describe("parseParent", () => {
  test("parses orphan selector (-)", () => {
    const result = parseParent("-");
    expect(result).toEqual({ type: "none" });
  });

  test("parses sibling selector (=)", () => {
    const result = parseParent("=");
    expect(result).toEqual({ type: "same" });
  });

  test("parses different parent selector (-=)", () => {
    const result = parseParent("-=");
    expect(result).toEqual({ type: "different" });
  });

  test("parses children selector (.)", () => {
    const result = parseParent(".");
    expect(result).toEqual({ type: "children" });
  });

  test("parses specific page name", () => {
    const result = parseParent("blog:index");
    expect(result).toEqual({ type: "page", name: "blog:index" });
  });

  test("returns undefined for empty string", () => {
    const result = parseParent("");
    expect(result).toBeUndefined();
  });

  test("returns undefined for whitespace-only string", () => {
    const result = parseParent("   ");
    expect(result).toBeUndefined();
  });
});

describe("parseDateSelector", () => {
  test("parses year format: 2024", () => {
    const result = parseDateSelector("2024");
    expect(result).toEqual({ type: "year", year: 2024 });
  });

  test("parses year.month format: 2024.03", () => {
    const result = parseDateSelector("2024.03");
    expect(result).toEqual({ type: "month", year: 2024, month: 3 });
  });

  test("parses year.month format with single digit month: 2024.3", () => {
    const result = parseDateSelector("2024.3");
    expect(result).toEqual({ type: "month", year: 2024, month: 3 });
  });

  test("parses comparison: >=2024.01.15", () => {
    const result = parseDateSelector(">=2024.01.15");
    expect(result).toEqual({ type: "comparison", op: ">=", date: "2024.01.15" });
  });

  test("parses comparison: <2024", () => {
    const result = parseDateSelector("<2024");
    expect(result).toEqual({ type: "comparison", op: "<", date: "2024" });
  });

  test("parses comparison: <>2024", () => {
    const result = parseDateSelector("<>2024");
    expect(result).toEqual({ type: "comparison", op: "<>", date: "2024" });
  });

  test("parses relative: last 7 days", () => {
    const result = parseDateSelector("last 7 days");
    expect(result).toEqual({ type: "relative", unit: "day", count: 7 });
  });

  test("parses relative: last day", () => {
    const result = parseDateSelector("last day");
    expect(result).toEqual({ type: "relative", unit: "day", count: 1 });
  });

  test("parses relative: last 2 weeks", () => {
    const result = parseDateSelector("last 2 weeks");
    expect(result).toEqual({ type: "relative", unit: "week", count: 2 });
  });

  test("parses relative: last month", () => {
    const result = parseDateSelector("last month");
    expect(result).toEqual({ type: "relative", unit: "month", count: 1 });
  });

  test("returns undefined for empty string", () => {
    const result = parseDateSelector("");
    expect(result).toBeUndefined();
  });

  test("returns undefined for invalid format", () => {
    const result = parseDateSelector("invalid");
    expect(result).toBeUndefined();
  });

  test("returns undefined for invalid month (> 12)", () => {
    const result = parseDateSelector("2024.13");
    expect(result).toBeUndefined();
  });

  test("returns undefined for invalid month (0)", () => {
    const result = parseDateSelector("2024.0");
    expect(result).toBeUndefined();
  });

  test("returns undefined for last 0 days", () => {
    const result = parseDateSelector("last 0 days");
    expect(result).toBeUndefined();
  });
});

describe("parseNumericSelector", () => {
  test("parses plain number as equals", () => {
    const result = parseNumericSelector("5");
    expect(result).toEqual({ op: "=", value: 5 });
  });

  test("parses negative number", () => {
    const result = parseNumericSelector("-3");
    expect(result).toEqual({ op: "=", value: -3 });
  });

  test("parses >=", () => {
    const result = parseNumericSelector(">=10");
    expect(result).toEqual({ op: ">=", value: 10 });
  });

  test("parses <=", () => {
    const result = parseNumericSelector("<=5");
    expect(result).toEqual({ op: "<=", value: 5 });
  });

  test("parses >", () => {
    const result = parseNumericSelector(">0");
    expect(result).toEqual({ op: ">", value: 0 });
  });

  test("parses <", () => {
    const result = parseNumericSelector("<100");
    expect(result).toEqual({ op: "<", value: 100 });
  });

  test("parses decimal numbers", () => {
    const result = parseNumericSelector(">=4.5");
    expect(result).toEqual({ op: ">=", value: 4.5 });
  });

  test("returns undefined for empty string", () => {
    const result = parseNumericSelector("");
    expect(result).toBeUndefined();
  });

  test("returns undefined for non-numeric", () => {
    const result = parseNumericSelector("abc");
    expect(result).toBeUndefined();
  });

  test("returns undefined for mixed numeric/alpha (10abc)", () => {
    const result = parseNumericSelector("10abc");
    expect(result).toBeUndefined();
  });

  test("returns undefined for Infinity", () => {
    const result = parseNumericSelector("Infinity");
    expect(result).toBeUndefined();
  });

  test("returns undefined for operator with invalid value", () => {
    const result = parseNumericSelector(">=abc");
    expect(result).toBeUndefined();
  });
});

describe("normalizeQuery", () => {
  test("normalizes complete query", () => {
    const query = {
      pagetype: "normal" as const,
      category: "blog -admin",
      tags: "+featured -draft article",
      order: "created_at desc",
      parent: ".",
      createdAt: "2024",
      rating: ">=5",
      limit: 10,
      offset: 0,
    };

    const result = normalizeQuery(query);

    expect(result.pagetype).toBe("normal");
    expect(result.category).toEqual({
      include: ["blog"],
      exclude: ["admin"],
      all: false,
      current: false,
    });
    expect(result.tags).toEqual({
      all: ["featured"],
      none: ["draft"],
      any: ["article"],
      special: null,
    });
    expect(result.order).toEqual({ field: "created_at", direction: "desc" });
    expect(result.parent).toEqual({ type: "children" });
    expect(result.createdAt).toEqual({ type: "year", year: 2024 });
    expect(result.rating).toEqual({ op: ">=", value: 5 });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  test("handles empty query", () => {
    const result = normalizeQuery({});
    expect(result).toEqual({});
  });

  test("passes through simple fields", () => {
    const query = {
      linkTo: "some-page",
      createdBy: "admin",
      name: "test*",
      fullname: "blog:test",
      range: "before" as const,
      perPage: 20,
      reverse: true,
    };

    const result = normalizeQuery(query);

    expect(result.linkTo).toBe("some-page");
    expect(result.createdBy).toBe("admin");
    expect(result.name).toBe("test*");
    expect(result.fullname).toBe("blog:test");
    expect(result.range).toBe("before");
    expect(result.perPage).toBe(20);
    expect(result.reverse).toBe(true);
  });

  test("handles dataFormFields", () => {
    const query = {
      dataFormFields: {
        status: "active",
        priority: "high",
      },
    };

    const result = normalizeQuery(query);
    expect(result.dataFormFields).toEqual({
      status: "active",
      priority: "high",
    });
  });
});

describe("resolveQuery", () => {
  const createRequirement = (
    rawAttributes: Record<string, string>,
    urlAttrPrefix?: string,
  ): ListPagesDataRequirement => ({
    id: 0,
    query: {},
    neededVariables: [],
    rawAttributes,
    urlAttrPrefix,
  });

  test("resolves @URL|default with no URL params (uses default)", () => {
    const req = createRequirement({ offset: "@URL|0", limit: "@URL|10" });
    const urlParams = new Map<string, string>();
    const result = resolveQuery(req, urlParams);

    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
  });

  test("resolves @URL with URL params", () => {
    const req = createRequirement({ offset: "@URL|0", limit: "@URL|10" });
    const urlParams = parseUrlParams("/scp-001/offset/20/limit/5");
    const result = resolveQuery(req, urlParams);

    expect(result.offset).toBe(20);
    expect(result.limit).toBe(5);
  });

  test("resolves with urlAttrPrefix", () => {
    const req = createRequirement({ offset: "@URL|0", limit: "@URL|10" }, "page2");
    const urlParams = parseUrlParams("/scp-001/page2_offset/30/page2_limit/15");
    const result = resolveQuery(req, urlParams);

    expect(result.offset).toBe(30);
    expect(result.limit).toBe(15);
  });

  test("ignores non-prefixed params when urlAttrPrefix is set", () => {
    const req = createRequirement({ offset: "@URL|0" }, "page2");
    const urlParams = parseUrlParams("/scp-001/offset/50");
    const result = resolveQuery(req, urlParams);

    expect(result.offset).toBe(0); // Uses default since offset (without prefix) doesn't match
  });

  test("resolves string fields", () => {
    const req = createRequirement({ tags: "@URL|+fruit", order: "@URL|dateCreatedDesc" });
    const urlParams = parseUrlParams("/scp-001/tags/-admin/order/titleAsc");
    const result = resolveQuery(req, urlParams);

    expect(result.tags).toBe("-admin");
    expect(result.order).toBe("titleAsc");
  });

  test("resolves boolean fields", () => {
    const req = createRequirement({ reverse: "@URL|false" });
    const urlParams = parseUrlParams("/scp-001/reverse/true");
    const result = resolveQuery(req, urlParams);

    expect(result.reverse).toBe(true);
  });

  test("preserves existing query values when not overridden", () => {
    const req: ListPagesDataRequirement = {
      id: 0,
      query: { category: "blog", pagetype: "normal" },
      neededVariables: [],
      rawAttributes: { offset: "@URL|0" },
    };
    const urlParams = parseUrlParams("/test-page/offset/5");
    const result = resolveQuery(req, urlParams);

    expect(result.category).toBe("blog");
    expect(result.pagetype).toBe("normal");
    expect(result.offset).toBe(5);
  });

  test("handles invalid number values gracefully", () => {
    const req = createRequirement({ offset: "@URL|0" });
    const urlParams = new Map([["offset", "invalid"]]);
    const result = resolveQuery(req, urlParams);

    expect(result.offset).toBeUndefined();
  });

  test("handles per-page attribute (kebab-case)", () => {
    const req = createRequirement({ "per-page": "@URL|20" });
    const urlParams = parseUrlParams("/test-page/per-page/50");
    const result = resolveQuery(req, urlParams);

    expect(result.perPage).toBe(50);
  });
});

describe("resolveAndNormalizeQuery", () => {
  test("resolves and normalizes in one call", () => {
    const req: ListPagesDataRequirement = {
      id: 0,
      query: {},
      neededVariables: [],
      rawAttributes: {
        tags: "@URL|+fruit -admin",
        category: "@URL|blog",
        order: "@URL|dateCreatedDesc",
        offset: "@URL|0",
        limit: "@URL|10",
      },
    };
    const urlParams = parseUrlParams("/test-page/offset/5");
    const result = resolveAndNormalizeQuery(req, urlParams);

    // Offset resolved from URL
    expect(result.offset).toBe(5);
    // Limit from default
    expect(result.limit).toBe(10);
    // Tags normalized
    expect(result.tags?.all).toEqual(["fruit"]);
    expect(result.tags?.none).toEqual(["admin"]);
    // Category normalized
    expect(result.category?.include).toEqual(["blog"]);
    // Order normalized
    expect(result.order?.field).toBe("created_at");
    expect(result.order?.direction).toBe("desc");
  });
});
