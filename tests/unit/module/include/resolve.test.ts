import { test, expect, describe } from "bun:test";
import { parse, resolveIncludes, type ParserOptions } from "@wdprlib/parser";
import type { SyntaxTree } from "@wdprlib/ast";
import { getAllText } from "../../../helpers";

function parseAst(input: string, options?: ParserOptions): SyntaxTree {
  return parse(input, options).ast;
}

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

  test("mutual circular includes stop at maxIterations", () => {
    // A includes B, B includes A → oscillates until maxIterations
    const source = "[[include page-a]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") return "[[include page-b]]";
      if (pageRef.page === "page-b") return "[[include page-a]]";
      return null;
    };

    // With maxIterations=3, should oscillate and stop
    const expanded = resolveIncludes(source, fetcher, { maxIterations: 3 });
    // After 3 iterations the include is still present (oscillating)
    expect(expanded).toContain("[[include");
  });

  test("self-referencing include stops immediately (no change)", () => {
    // Page A contains [[include page-a]] → after 1 replacement, content
    // is the same cached source containing [[include page-a]] again.
    // Next iteration produces same result → stops.
    const source = "[[include page-a]]";
    let fetchCount = 0;
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      fetchCount++;
      if (pageRef.page === "page-a") return "Self: [[include page-a]]";
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    // Eventually stabilizes (the include keeps producing the same text)
    expect(expanded).toContain("Self:");
    // Fetcher is called only once (cached)
    expect(fetchCount).toBe(1);
  });

  test("respects maxIterations", () => {
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

    // Each iteration expands one layer of includes
    const expanded = resolveIncludes(source, fetcher, { maxIterations: 3 });
    expect(expanded).toContain("Level 1");
    expect(expanded).toContain("Level 2");
    expect(expanded).toContain("Level 3");
    // After 3 iterations, level-4 is still unexpanded
    expect(expanded).toContain("[[include level-4]]");
  });

  test("stops early when no changes occur", () => {
    const source = "[[include page-a]]";
    let fetchCount = 0;
    const fetcher = () => {
      fetchCount++;
      return "No nested includes here";
    };

    const expanded = resolveIncludes(source, fetcher, { maxIterations: 10 });
    expect(expanded).toBe("No nested includes here");
    // Fetcher called once, then no more iterations needed
    expect(fetchCount).toBe(1);
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

  test("same page with different variables uses cache but substitutes differently", () => {
    const source = "[[include tmpl | x=1]]\n[[include tmpl | x=2]]";
    let fetchCount = 0;
    const fetcher = () => {
      fetchCount++;
      return "val={$x}";
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(fetchCount).toBe(1);
    expect(expanded).toContain("val=1");
    expect(expanded).toContain("val=2");
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

  test("same page from different routes expands correctly", () => {
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

  test("case-insensitive page key caching", () => {
    // Page-A and page-a should hit the same cache entry
    const source = "[[include Page-A]]\n[[include page-a]]";
    let fetchCount = 0;
    const fetcher = () => {
      fetchCount++;
      return "content";
    };

    resolveIncludes(source, fetcher);
    expect(fetchCount).toBe(1);
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

  describe("bracket-balanced directive extent", () => {
    // The closing `]]` is chosen so that nested `[[ ... ]]` (or a stray
    // `]]`) inside a parameter value does not end the directive early.
    const fetcher = (ref: { site: string | null; page: string }) =>
      ref.page === "tmpl" ? "<<{$cap}>>" : null;

    test("nested [[...]] markup in a value is captured whole", () => {
      const source = "[[include tmpl\n|cap=[[span]]A[[span]]B[[/span]][[/span]]C\n]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[span]]A[[span]]B[[/span]][[/span]]C>>");
    });

    test("a mid-line stray ]] does not close the directive early", () => {
      const source = "[[include tmpl\n|cap=x ]] y\n]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<x ]] y>>");
    });

    test("single-line directive closes at the trailing ]]", () => {
      const source = "[[include tmpl |cap=[[span]]hi[[/span]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[span]]hi[[/span]]>>");
    });

    test("inline directive followed by text falls back to the balanced close", () => {
      const source = "[[include tmpl |cap=hi]] trailing";
      expect(resolveIncludes(source, fetcher)).toBe("<<hi>> trailing");
    });

    test("two stacked directives each resolve independently", () => {
      const source = "[[include tmpl |cap=A]]\n[[include tmpl |cap=[[span]]B[[/span]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<A>>\n<<[[span]]B[[/span]]>>");
    });

    test("an opener that never balances is left untouched", () => {
      const source = "[[include tmpl |cap=foo [[ bar";
      expect(resolveIncludes(source, fetcher)).toBe("[[include tmpl |cap=foo [[ bar");
    });

    test("triple-bracket link on its own line is kept whole", () => {
      // The realistic shape: a link in a multi-line caption with the
      // directive close `]]` on a separate line.
      const source = "[[include tmpl\n|cap=[[[*http://x|L]]] note\n]]";
      // Caption is split at the link's `|` (matching Wikidot), but the
      // directive is not cut short by the link's `]]]`.
      expect(resolveIncludes(source, fetcher)).toBe("<<[[[*http://x>>");
    });

    test("triple-bracket link butted against the close on one line", () => {
      // The link's `]]]` and the directive's `]]` are adjacent: `[[[link]]]]]`.
      // Link brackets are counted separately, so the `]]]` closes the link
      // and only the trailing `]]` closes the directive — the link survives.
      const source = "[[include tmpl |cap=[[[link]]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[[link]]]>>");
    });

    test("a `]]` inside a link does not close the directive early", () => {
      // Inside `[[[ ... ]]]` the content is literal, so a stray `]]` there
      // belongs to the link rather than terminating the directive.
      const source = "[[include tmpl |cap=[[[a ]] b]]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[[a ]] b]]]>>");
    });

    test("a `[[` inside a link does not block the directive close", () => {
      const source = "[[include tmpl |cap=[[[a [[ b]]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[[a [[ b]]]>>");
    });

    test("adjacent directives with links resolve independently", () => {
      // Link brackets are counted locally, so the first directive's link
      // does not reach into the second directive's `]]]`.
      const source = "[[include tmpl |cap=[[[a]]]]]\n[[include tmpl |cap=[[[b]]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<[[[a]]]>>\n<<[[[b]]]>>");
    });

    test("multi-line directive captures trailing ] into the final attribute value", () => {
      // When a final attribute value ends in `]` and the directive's
      // closing `]]` follows without a separator (`--]]]`), Wikidot
      // greedily consumes the trailing `]` into the value — so the
      // attribute is `--]` and the close lands on the last `]]`.
      const source = "[[include tmpl\n|cap= --]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<--]>>");
    });

    test("multi-line directive with trailing ] followed by other content", () => {
      // After the greedy close, source past the directive is preserved
      // intact (no stray `]` left outside).
      const source = "[[include tmpl\n|cap= --]]]\n\nafter";
      expect(resolveIncludes(source, fetcher)).toBe("<<--]>>\n\nafter");
    });

    test("multi-line directive collapses an entire ]]]+ run into the close", () => {
      // `]]]]]`: the close consumes all trailing `]`, so the value
      // captures `x]]]` and nothing is left outside the directive.
      const source = "[[include tmpl\n|cap= x]]]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<x]]]>>");
    });

    test("inline directive captures trailing ] before whitespace into the value", () => {
      // Same greedy behaviour on a single-line directive: the `]` after
      // `]]` is consumed into the value, not left outside.
      const source = "[[include tmpl |cap=x]]] rest";
      expect(resolveIncludes(source, fetcher)).toBe("<<x]>> rest");
    });

    test("plain include (no attributes) keeps a trailing ] outside the directive", () => {
      // Without an attribute section the page name must not absorb a
      // stray `]`; otherwise the fetcher would look up `tmpl]`.
      // (`{$cap}` stays literal because no `cap=` was supplied.)
      const source = "[[include tmpl]]]";
      expect(resolveIncludes(source, fetcher)).toBe("<<{$cap}>>]");
    });

    test("plain include whose page name contains = keeps a trailing ] outside", () => {
      // `=` may legitimately occur inside a page name; presence of `=`
      // alone must not enable greedy absorption.
      const custom = (ref: { site: string | null; page: string }) =>
        ref.page === "foo=bar" ? "OK" : `MISS:${ref.page}`;
      const source = "[[include foo=bar]]]";
      expect(resolveIncludes(source, custom)).toBe("OK]");
    });

    test("space-separated parameters do trigger greedy absorption", () => {
      // `[[include foo bar=--]]]`: the space after the page name marks
      // an attribute section, so greedy absorption applies and the
      // attribute captures `--]`.
      const custom = (ref: { site: string | null; page: string }) =>
        ref.page === "foo" ? `<<${"{$bar}"}>>` : null;
      const source = "[[include foo bar=--]]]";
      expect(resolveIncludes(source, custom)).toBe("<<--]>>");
    });
  });

  describe("default-value idiom (duplicate key)", () => {
    // A template forwards a variable with a fallback default by writing
    // `key={$key}|key=default`. Once the caller's value is substituted,
    // the duplicate-key pair must resolve to the caller's value when
    // present, or the default otherwise.

    test("caller value wins over the default", () => {
      const source = "[[include tmpl | foo=given]]";
      // Template forwards foo to an inner include with a default.
      const fetcher = (ref: { site: string | null; page: string }) => {
        if (ref.page === "tmpl") return "[[include base foo={$foo}|foo=fallback]]";
        if (ref.page === "base") return "<<{$foo}>>";
        return null;
      };
      expect(resolveIncludes(source, fetcher)).toBe("<<given>>");
    });

    test("default applies when caller omits the variable", () => {
      const source = "[[include tmpl]]";
      const fetcher = (ref: { site: string | null; page: string }) => {
        if (ref.page === "tmpl") return "[[include base foo={$foo}|foo=fallback]]";
        if (ref.page === "base") return "<<{$foo}>>";
        return null;
      };
      // {$foo} stays unresolved (placeholder), so the default `fallback` wins.
      expect(resolveIncludes(source, fetcher)).toBe("<<fallback>>");
    });

    test("default applies when caller passes an empty value", () => {
      const source = "[[include base foo=|foo=fallback]]";
      const fetcher = () => "<<{$foo}>>";
      expect(resolveIncludes(source, fetcher)).toBe("<<fallback>>");
    });

    test("first concrete value wins among several duplicates", () => {
      const source = "[[include base foo=first|foo=second|foo=third]]";
      const fetcher = () => "<<{$foo}>>";
      expect(resolveIncludes(source, fetcher)).toBe("<<first>>");
    });

    test("multiple keys each resolve independently", () => {
      const source = "[[include tmpl | a=A]]";
      const fetcher = (ref: { site: string | null; page: string }) => {
        if (ref.page === "tmpl") return "[[include base a={$a}|a=da|b={$b}|b=db]]";
        if (ref.page === "base") return "<<{$a}|{$b}>>";
        return null;
      };
      // a supplied -> A ; b omitted -> default db
      expect(resolveIncludes(source, fetcher)).toBe("<<A|db>>");
    });
  });

  test("handles space-separated parameters in first segment", () => {
    const source = "[[include component:coltop show=+ 開く|hide=- 閉じる]]";
    let receivedPageRef: { site: string | null; page: string } | null = null;
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      receivedPageRef = pageRef;
      return "Content with {$show} and {$hide}";
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(receivedPageRef!.page).toBe("component:coltop");
    expect(expanded).toContain("Content with + 開く and - 閉じる");
  });

  test("handles space-separated parameters without pipe", () => {
    const source = "[[include my-page key=value]]";
    let receivedPageRef: { site: string | null; page: string } | null = null;
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      receivedPageRef = pageRef;
      return "Got {$key}";
    };

    const expanded = resolveIncludes(source, fetcher);
    expect(receivedPageRef!.page).toBe("my-page");
    expect(expanded).toContain("Got value");
  });

  test("preserves surrounding text", () => {
    const source = "Before\n[[include my-page]]\nAfter";
    const fetcher = () => "Included";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("Before\nIncluded\nAfter");
  });

  test("does not resolve include that is not at line start", () => {
    const source = "abc [[include my-page]]";
    const fetcher = () => "Should not appear";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("abc [[include my-page]]");
  });

  test("does not resolve include preceded by @@", () => {
    const source = "@@[[include my-page]]@@";
    const fetcher = () => "Should not appear";

    const expanded = resolveIncludes(source, fetcher);
    expect(expanded).toBe("@@[[include my-page]]@@");
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
    const ast = parseAst(expanded);
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
    const creditEnd = "\n[[/div]]";

    const source = "[[include credit:start]]\nContent here\n[[include credit:end]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "credit:start") return creditStart;
      if (pageRef.page === "credit:end") return creditEnd;
      return null;
    };

    const expanded = resolveIncludes(source, fetcher);
    const ast = parseAst(expanded);
    const allText = getAllText(ast.elements);
    expect(allText).not.toContain("[[/div]]");
    expect(allText).toContain("Content here");
  });

  test("inc-loop pattern: same page with variable-driven recursion", () => {
    // Simulates inc-loop-base: a page that includes itself with decremented counter
    // Page "loop" contains: "Item {$n}\n[[include loop | n={$next}]]" but we need
    // to simulate variable-driven content changes across iterations
    const source = "[[include counter | n=3]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "counter") {
        // The page source contains a conditional pattern:
        // If {$n} > 0, include self with n-1
        return "Count:{$n}\n[[include counter | n={$next}]]";
      }
      return null;
    };

    // Iteration 1: source becomes "Count:3\n[[include counter | n={$next}]]"
    // {$next} is unresolved, so next include has n={$next}
    // Iteration 2: "Count:3\nCount:{$next}\n[[include counter | n={$next}]]"
    // Iteration 3: same pattern continues
    const expanded = resolveIncludes(source, fetcher, { maxIterations: 3 });
    expect(expanded).toContain("Count:3");
  });
});
