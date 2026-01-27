import { test, expect, describe } from "bun:test";
import { parse, resolveIncludes } from "@wdpr/parser";
import { getAllText } from "../../../helpers";

describe("resolveIncludes", () => {
  test("resolves a simple include", () => {
    const source = "[[include my-page]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "my-page") return "Hello from included page";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("Hello from included page");
  });

  test("returns error block for page not found", () => {
    const source = "[[include missing-page]]";
    const fetcher = () => null;

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("cannot be found");
  });

  test("substitutes variables", () => {
    const source = "[[include my-page | name=World]]";
    const fetcher = () => "Hello {$name}!";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("Hello World!");
  });

  test("handles nested includes", () => {
    const source = "[[include page-a]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "A content\n[[include page-b]]";
      if (pageRef.page === "page-b") return "Content from B";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("A content");
    expect(expanded).toContain("Content from B");
    expect(expanded).not.toContain("[[include");
  });

  test("detects circular includes", () => {
    const source = "[[include page-a]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "[[include page-b]]";
      if (pageRef.page === "page-b") return "[[include page-a]]";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("Circular include detected");
  });

  test("respects maxDepth", () => {
    const source = "[[include level-1]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      const match = pageRef.page.match(/level-(\d+)/);
      if (match) {
        const level = parseInt(match[1]!);
        if (level < 10) return `Level ${level}\n[[include level-${level + 1}]]`;
        return `Level ${level}`;
      }
      return null;
    };

    const expanded = resolveIncludes(source, fetcher, { maxDepth: 3 });
    expect(expanded).toContain("Level 1");
    expect(expanded).toContain("Level 2");
    expect(expanded).toContain("Level 3");
    // 深度4以降は展開されずに残る
    expect(expanded).toContain("[[include level-4]]");
  });

  test("caches fetcher calls for same page", () => {
    const source = "[[include page-a]]\n[[include page-a]]";
    let fetchCount = 0;
    const fetcher = () => {
      fetchCount++;
      return "Cached content";
    };

    resolveIncludes(source, fetcher);
    expect(fetchCount).toBe(1);
  });

  test("handles fetcher exceptions", () => {
    const source = "[[include error-page]]";
    const fetcher = (): string | null => {
      throw new Error("Network error");
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("cannot be found");
  });

  test("handles site-prefixed page references", () => {
    const source = "[[include :other-site:my-page]]";
    let receivedPageRef: { site: string | null; page: string } | null = null;
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      receivedPageRef = pageRef;
      return "Cross-site content";
    };

    resolveIncludes(source, fetcher);
    expect(receivedPageRef!).toEqual({ site: "other-site", page: "my-page" });
  });

  test("same page from different routes is not circular", () => {
    const source = "[[include page-a]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "[[include page-b]]\n[[include page-c]]";
      if (pageRef.page === "page-b") return "B content\n[[include page-d]]";
      if (pageRef.page === "page-c") return "C content\n[[include page-d]]";
      if (pageRef.page === "page-d") return "Shared content";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("B content");
    expect(expanded).toContain("C content");
    const matches = expanded.match(/Shared content/g);
    expect(matches?.length).toBe(2);
  });

  test("escapes RegExp special characters in variable keys", () => {
    const source = "[[include page | a.b=value]]";
    const fetcher = () => "Result: {$a.b}";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("Result: value");
  });

  test("preserves non-include text unchanged", () => {
    const source = "Hello world";
    const fetcher = () => null;

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("Hello world");
  });

  test("normalizes page keys for circular detection (case insensitive)", () => {
    const source = "[[include Page-A]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page.toLowerCase() === "page-a") return "[[include page-a]]";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("Circular include detected");
  });

  test("multiple variables are substituted", () => {
    const source = "[[include tmpl | first=John | last=Doe]]";
    const fetcher = () => "{$first} {$last}";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("John Doe");
  });

  test("unresolved variables remain as-is", () => {
    const source = "[[include page | name=Alice]]";
    const fetcher = () => "Hello {$name}, welcome to {$site}";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain("Hello Alice");
    expect(expanded).toContain("{$site}");
  });

  test("preserves surrounding text", () => {
    const source = "Before\n[[include my-page]]\nAfter";
    const fetcher = () => "Included";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("Before\nIncluded\nAfter");
  });

  test("div blocks spanning across includes are correctly parsed", () => {
    const source = "[[include credit:start]]\naaa\n[[include credit:end]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "credit:start") return '[[div class="credit"]]\n';
      if (pageRef.page === "credit:end") return "\n[[/div]]";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toContain('[[div class="credit"]]');
    expect(expanded).toContain("aaa");
    expect(expanded).toContain("[[/div]]");

    // パースすると正しいAST構造になる
    const ast = parse(expanded);
    const divElement = ast.elements.find(
      (el) => el.element === "container" && (el.data as Record<string, unknown>).type === "div",
    );
    expect(divElement).toBeDefined();

    const divData = divElement!.data as { elements: Element[] };
    const text = getAllText(divData.elements);
    expect(text).toContain("aaa");
  });

  test("complex credit include with nested divs", () => {
    const creditStart = `[[div_ class="creditRate creditModule"]]\n[[div_ class="rateBox"]]\n[[div_ class="rate-box-with-credit-button"]]\n[[/div]]\n[[/div]]\n[[/div]]\n[[div class="credit"]]\n`;
    const creditEnd = `\n[[/div]]`;

    const source = "[[include credit:start]]\nContent here\n[[include credit:end]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "credit:start") return creditStart;
      if (pageRef.page === "credit:end") return creditEnd;
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    const ast = parse(expanded);
    const allText = getAllText(ast.elements);
    expect(allText).not.toContain("[[/div]]");
    expect(allText).toContain("Content here");
  });
});
