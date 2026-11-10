import { describe, expect, test } from "bun:test";
import {
  resolveIncludes,
  resolveIncludesAsync,
  resolveIncludesAsyncWithTrace,
  resolveIncludesWithTrace,
} from "@wdprlib/parser";

// Each page includes the other k times, so every iteration multiplies the source by k.
function mutualPages(k: number): Record<string, string> {
  return { a: "[[include b]]\n".repeat(k), b: "[[include a]]\n".repeat(k) };
}

describe("include expansion length limit", () => {
  test("stops mutual includes before they grow geometrically", () => {
    const pages = mutualPages(4);
    const traced = resolveIncludesWithTrace("[[include a]]", ({ page }) => pages[page] ?? null);

    expect(traced.source.length).toBeLessThanOrEqual(1_000_000);
    expect(traced.reachedMaxLength).toBe(true);
  });

  test("accepts a result of exactly maxLength and rejects one more character", () => {
    const fetch = () => "x".repeat(10);

    expect(resolveIncludes("[[include a]]", fetch, { maxLength: 10 })).toBe("x".repeat(10));
    expect(resolveIncludes("[[include a]]!", fetch, { maxLength: 10 })).toBe("[[include a]]!");
  });

  test("keeps the source and traces nothing when the first iteration is too long", () => {
    const traced = resolveIncludesWithTrace("[[include a]]", () => "x".repeat(11), {
      maxLength: 10,
    });

    expect(traced.source).toBe("[[include a]]");
    expect(traced.dependencies).toEqual([]);
    expect(traced.iterations).toEqual([]);
    expect(traced.reachedMaxLength).toBe(true);
  });

  test("keeps the last iteration within the limit", () => {
    const pages: Record<string, string> = { a: "[[include b]][[include b]]", b: "y".repeat(20) };
    const traced = resolveIncludesWithTrace("[[include a]]", ({ page }) => pages[page] ?? null, {
      maxLength: 30,
    });

    expect(traced.source).toBe("[[include b]][[include b]]");
    expect(traced.iterations.map(({ iteration }) => iteration)).toEqual([0]);
    expect(traced.dependencies.map(({ location }) => location.page)).toEqual(["a"]);
    expect(traced.reachedMaxLength).toBe(true);
  });

  test("applies the same limit to async expansion", async () => {
    const pages = mutualPages(4);
    const fetch = async ({ page }: { page: string }) => pages[page] ?? null;
    const traced = await resolveIncludesAsyncWithTrace("[[include a]]", fetch);

    expect(traced.source.length).toBeLessThanOrEqual(1_000_000);
    expect(traced.reachedMaxLength).toBe(true);
    expect(
      await resolveIncludesAsync("[[include a]]!", async () => "x".repeat(10), {
        maxLength: 10,
      }),
    ).toBe("[[include a]]!");
  });

  // Each assignment doubles the content, so 30 of them would build about 2^30 characters.
  test("stops chained variable substitution before it grows", () => {
    const keys = Array.from({ length: 31 }, (_, i) => `v${i}`);
    const args = keys
      .slice(0, -1)
      .map((key, i) => `${key}={$${keys[i + 1]}}{$${keys[i + 1]}}`)
      .join("|");
    const traced = resolveIncludesWithTrace(`[[include p |${args}|v30=Z]]`, () => "{$v0}", {
      maxLength: 1_000,
    });

    expect(traced.reachedMaxLength).toBe(true);
    expect(traced.source.startsWith("[[include p")).toBe(true);
  }, 2_000);

  test("allows substitution that shrinks the content below the limit", () => {
    expect(resolveIncludes("[[include p |a=x]]", () => "{$a}{$a}{$a}", { maxLength: 5 })).toBe(
      "xxx",
    );
  });

  test("stops starting async fetches once fetched text exceeds the limit", async () => {
    const source = Array.from({ length: 20 }, (_, i) => `[[include p${i}]]`).join("\n");
    let calls = 0;
    const traced = await resolveIncludesAsyncWithTrace(source, async () => {
      calls++;
      return "x".repeat(1_000_001);
    });

    expect(traced.reachedMaxLength).toBe(true);
    expect(calls).toBeLessThanOrEqual(8);
  });

  // NaN and Infinity would make every comparison pass and disable the limit.
  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects maxLength %p",
    (maxLength) => {
      expect(() => resolveIncludes("[[include a]]", () => "x", { maxLength })).toThrow(RangeError);
    },
  );
});
