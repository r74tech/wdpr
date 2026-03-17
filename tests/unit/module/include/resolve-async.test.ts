import { test, expect, describe } from "bun:test";
import { parse, resolveIncludesAsync, type ParserOptions } from "@wdprlib/parser";
import type { SyntaxTree } from "@wdprlib/ast";
import { getAllText } from "../../../helpers";

function parseAst(input: string, options?: ParserOptions): SyntaxTree {
  return parse(input, options).ast;
}

describe("resolveIncludesAsync", () => {
  test("resolves a simple include", async () => {
    const source = "[[include my-page]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "my-page") return "Hello from included page";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toBe("Hello from included page");
  });

  test("returns error block for page not found", async () => {
    const source = "[[include missing-page]]";
    const fetcher = async () => null;

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("cannot be found");
  });

  test("substitutes variables", async () => {
    const source = "[[include my-page | name=World]]";
    const fetcher = async () => "Hello {$name}!";

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toBe("Hello World!");
  });

  test("handles nested includes", async () => {
    const source = "[[include page-a]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "A content\n[[include page-b]]";
      if (pageRef.page === "page-b") return "Content from B";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("A content");
    expect(expanded).toContain("Content from B");
    expect(expanded).not.toContain("[[include");
  });

  test("mutual circular includes stop at maxIterations", async () => {
    const source = "[[include page-a]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "[[include page-b]]";
      if (pageRef.page === "page-b") return "[[include page-a]]";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher, { maxIterations: 3 });
    expect(expanded).toContain("[[include");
  });

  test("self-referencing include stops immediately", async () => {
    const source = "[[include page-a]]";
    let fetchCount = 0;
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      fetchCount++;
      if (pageRef.page === "page-a") return "Self: [[include page-a]]";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("Self:");
    expect(fetchCount).toBe(1);
  });

  test("respects maxIterations", async () => {
    const source = "[[include level-1]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      const match = pageRef.page.match(/level-(\d+)/);
      if (match) {
        const level = parseInt(match[1]!);
        if (level < 10) return `Level ${level}\n[[include level-${level + 1}]]`;
        return `Level ${level}`;
      }
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher, { maxIterations: 3 });
    expect(expanded).toContain("Level 1");
    expect(expanded).toContain("Level 2");
    expect(expanded).toContain("Level 3");
    expect(expanded).toContain("[[include level-4]]");
  });

  test("stops early when no changes occur", async () => {
    const source = "[[include page-a]]";
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return "No nested includes here";
    };

    const expanded = await resolveIncludesAsync(source, fetcher, { maxIterations: 10 });
    expect(expanded).toBe("No nested includes here");
    expect(fetchCount).toBe(1);
  });

  test("caches fetcher calls for same page", async () => {
    const source = "[[include page-a]]\n[[include page-a]]";
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return "Cached content";
    };

    await resolveIncludesAsync(source, fetcher);
    expect(fetchCount).toBe(1);
  });

  test("same page with different variables uses cache but substitutes differently", async () => {
    const source = "[[include tmpl | x=1]]\n[[include tmpl | x=2]]";
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return "val={$x}";
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(fetchCount).toBe(1);
    expect(expanded).toContain("val=1");
    expect(expanded).toContain("val=2");
  });

  test("handles fetcher exceptions", async () => {
    const source = "[[include error-page]]";
    const fetcher = async (): Promise<string | null> => {
      throw new Error("Network error");
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("cannot be found");
  });

  test("handles site-prefixed page references", async () => {
    const source = "[[include :other-site:my-page]]";
    let receivedPageRef: { site: string | null; page: string } | null = null;
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      receivedPageRef = pageRef;
      return "Cross-site content";
    };

    await resolveIncludesAsync(source, fetcher);
    expect(receivedPageRef!).toEqual({ site: "other-site", page: "my-page" });
  });

  test("same page from different routes expands correctly", async () => {
    const source = "[[include page-a]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "[[include page-b]]\n[[include page-c]]";
      if (pageRef.page === "page-b") return "B content\n[[include page-d]]";
      if (pageRef.page === "page-c") return "C content\n[[include page-d]]";
      if (pageRef.page === "page-d") return "Shared content";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("B content");
    expect(expanded).toContain("C content");
    const matches = expanded.match(/Shared content/g);
    expect(matches?.length).toBe(2);
  });

  test("produces same result as sync resolveIncludes", async () => {
    const { resolveIncludes } = await import("@wdprlib/parser");

    const source = "Before\n[[include page-a | x=1]]\nMiddle\n[[include page-b]]\nAfter";
    const pages: Record<string, string> = {
      "page-a": "A={$x}\n[[include page-c]]",
      "page-b": "B content",
      "page-c": "C content",
    };

    const syncFetcher = (ref: { site: string | null; page: string }) => pages[ref.page] ?? null;
    const asyncFetcher = async (ref: { site: string | null; page: string }) =>
      pages[ref.page] ?? null;

    const syncResult = resolveIncludes(source, syncFetcher);
    const asyncResult = await resolveIncludesAsync(source, asyncFetcher);
    expect(asyncResult).toBe(syncResult);
  });

  test("fetcher is truly awaited (not just sync-wrapped)", async () => {
    const source = "[[include page-a]]";
    let resolved = false;
    const fetcher = async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
      return "async content";
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(resolved).toBe(true);
    expect(expanded).toBe("async content");
  });

  test("case-insensitive page key caching", async () => {
    const source = "[[include Page-A]]\n[[include page-a]]";
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return "content";
    };

    await resolveIncludesAsync(source, fetcher);
    expect(fetchCount).toBe(1);
  });

  test("multiple variables are substituted", async () => {
    const source = "[[include tmpl | first=John | last=Doe]]";
    const fetcher = async () => "{$first} {$last}";

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain("John Doe");
  });

  test("preserves surrounding text", async () => {
    const source = "Before\n[[include my-page]]\nAfter";
    const fetcher = async () => "Included";

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toBe("Before\nIncluded\nAfter");
  });

  test("does not resolve include that is not at line start", async () => {
    const source = "abc [[include my-page]]";
    const fetcher = async () => "Should not appear";

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toBe("abc [[include my-page]]");
  });

  test("div blocks spanning across includes are correctly parsed", async () => {
    const source = "[[include credit:start]]\naaa\n[[include credit:end]]";
    const fetcher = async (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "credit:start") return '[[div class="credit"]]\n';
      if (pageRef.page === "credit:end") return "\n[[/div]]";
      return null;
    };

    const expanded = await resolveIncludesAsync(source, fetcher);
    expect(expanded).toContain('[[div class="credit"]]');
    expect(expanded).toContain("aaa");
    expect(expanded).toContain("[[/div]]");

    const ast = parseAst(expanded);
    const divElement = ast.elements.find(
      (el) => el.element === "container" && (el.data as Record<string, unknown>).type === "div",
    );
    expect(divElement).toBeDefined();

    const divData = divElement!.data as { elements: Element[] };
    const text = getAllText(divData.elements);
    expect(text).toContain("aaa");
  });
});
