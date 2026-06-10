import { describe, expect, it } from "bun:test";
import { parse, resolveIncludes } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

/**
 * End-to-end coverage for the real-world idiom that motivated the
 * `]]]+` greedy close in `resolveIncludes`.
 *
 * A template wraps optional content in a Wikidot comment so the content
 * shows up only when the caller supplies a value that closes the comment
 * early. The template body looks like:
 *
 * ```
 * [!-- {$a}
 *
 * VISIBLE
 *
 * [!----]
 * ```
 *
 * Wikidot's `[!--` comment closes at the *first* `--]`. The caller toggles
 * the section by either:
 *
 * 1. Passing `a=--]` (typically written as `|a=--]]]` so the directive's
 *    closing `]]` follows without a separator): substituted into the
 *    template it becomes `[!-- --]\n\nVISIBLE\n\n[!----]`. The first `--]`
 *    closes the comment immediately, so `VISIBLE` shows up.
 * 2. Leaving `a` unset: the template ships with `{$a}` literal in place,
 *    so the comment opens with `[!-- {$a}\n\nVISIBLE\n\n[!--` and only
 *    closes at the `--]` inside `[!----]`, swallowing `VISIBLE`.
 *
 * The point of the test is that both branches require the include layer
 * to capture `--]` as the attribute value (and *not* leave a stray `]`
 * outside the directive that would break the comment markup).
 */
describe("include + comment-wrap toggle idiom", () => {
  const TEMPLATE = `[!-- {$a}

VISIBLE

[!----]

after`;

  function pipeline(source: string): string {
    const expanded = resolveIncludes(source, (ref) => {
      return ref.page === "tmpl" ? TEMPLATE : null;
    });
    const { ast } = parse(expanded);
    return renderToHtml(ast);
  }

  it("a=--]]] (caller supplies --] to close the comment early): VISIBLE shows", () => {
    const html = pipeline("[[include tmpl|a=--]]]");
    expect(html).toContain("VISIBLE");
    expect(html).toContain("after");
  });

  it("a unset: comment swallows the section, VISIBLE is hidden", () => {
    const html = pipeline("[[include tmpl]]");
    expect(html).not.toContain("VISIBLE");
    expect(html).toContain("after");
  });

  it("multi-line variant with several attributes preserves --] as the final value", () => {
    // `[[include tmpl|other=x|a=--]]]` — same idiom but with an extra
    // attribute before the trailing `--]`. The greedy close must apply
    // to the *final* value only and not accidentally eat the earlier
    // `|other=x|` section.
    const src = `[[include tmpl
|other=x
|a=--]]]`;
    const html = pipeline(src);
    expect(html).toContain("VISIBLE");
    expect(html).toContain("after");
  });
});
