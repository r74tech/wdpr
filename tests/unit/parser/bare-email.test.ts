import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";

describe("bare email", () => {
  it("does not inspect email or formatting inside a comment opener", () => {
    const html = renderToHtml(parse("**a [!--support@example.com ** secret--] b**").ast);
    expect(html).toBe("<p><strong>a  b</strong></p>");
  });
  it.each(["foo--bar@example.com", "x@foo--bar.com", "a__b@example.com"])(
    "preserves formatting characters in %s",
    (address) => {
      expect(renderToHtml(parse(address).ast)).toContain(`href="mailto:${address}">${address}</a>`);
    },
  );

  it.each([
    "[[#if 1|support@example.com|other@example.com]]",
    "[[#ifexpr 1|support@example.com|other@example.com]]",
    "[[bibliography]]\n: item : support@example.com\n[[/bibliography]]",
  ])("links in conditional and bibliography bodies: %s", (source) => {
    expect(renderToHtml(parse(source).ast)).toContain('href="mailto:support@example.com"');
  });

  it("bridges comments but not raw boundaries", () => {
    expect(renderToHtml(parse("a[!--hidden--]@example.com").ast)).toContain(
      'href="mailto:a@example.com"',
    );
    expect(renderToHtml(parse("a@@@@@example.com").ast)).not.toContain("mailto:");
    expect(renderToHtml(parse('[[a href="/"]]a[!--hidden--]@example.com[[/a]]').ast)).toBe(
      '<p><a href="/">a@example.com</a></p>',
    );
  });

  it("does not hide a raw or code close inside comment-like text", () => {
    expect(renderToHtml(parse("@@a[!--@@--]@example.com").ast)).toBe(
      '<p><span style="white-space: pre-wrap;">a[!--</span>--]@example.com</p>',
    );
    expect(renderToHtml(parse("[[code]]a[!--[[/code]]--]@example.com").ast)).toBe(
      '<div class="code"><pre><code>a[!--</code></pre></div><p>--]@example.com</p>',
    );
    expect(renderToHtml(parse("@@[!--@@foo@example.com--]").ast)).toContain(
      'href="mailto:foo@example.com--"',
    );
  });
  it("links an address and keeps adjacent punctuation", () => {
    const ast = parse("Mail (support@example.com), please.").ast;
    expect(renderToHtml(ast)).toBe(
      '<p>Mail (<a href="mailto:support@example.com">support@example.com</a>), please.</p>',
    );
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
  });

  it.each(["__hello a__b@example.com__", "|| __hello a__b@example.com__ ||"])(
    "does not close formatting inside an email: %s",
    (source) => {
      const html = renderToHtml(parse(source).ast);
      expect(html).toContain('href="mailto:a__b@example.com">a__b@example.com</a></span>');
      expect(html).not.toContain("</span>__");
    },
  );

  it("keeps addresses in URLs and attributes from becoming nested links", () => {
    const html = renderToHtml(
      parse('http://example.com/a@example.com [[span title="a@example.com"]]text[[/span]]').ast,
    );
    expect(html).not.toContain("mailto:");
    expect(html).toContain('href="http://example.com/a@example.com"');
  });

  it.each([
    "[[span]]support@example.com[[/span]]",
    "[[footnote]]support@example.com[[/footnote]]",
    "|| support@example.com ||",
    "* support@example.com",
    "+ support@example.com",
    "[[tabview]]\n[[tab One]]\nsupport@example.com\n[[/tab]]\n[[/tabview]]",
  ])("links plain text inside %s", (source) => {
    expect(renderToHtml(parse(source).ast)).toContain('href="mailto:support@example.com"');
  });

  it.each([
    "@@support@example.com@@",
    "@<support@example.com>@",
    "[[code]]\nsupport@example.com\n[[/code]]",
    "[[math]]support@example.com[[/math]]",
    "[!--support@example.com--]",
    '[[a href="https://example.com"]]**support@example.com**[[/a]]',
    "[https://example.com support@example.com]",
  ])("keeps protected content literal: %s", (source) => {
    expect(renderToHtml(parse(source).ast)).not.toContain("mailto:");
  });

  it("handles compact text and disabled position tracking", () => {
    const source = "plain ".repeat(20_000) + "support@example.com";
    expect(renderToHtml(parse(source, { trackPositions: false }).ast)).toContain(
      'href="mailto:support@example.com"',
    );
  });

  it("keeps invalid addresses unchanged", () => {
    const html = renderToHtml(parse("name@localhost name@.com name.@example.com").ast);
    expect(html).not.toContain("mailto:");
  });

  it.each([false, true])("handles a large block-list email group (after li: %s)", (afterLi) => {
    const source = "a@b.com ".repeat(70_000);
    const input = afterLi
      ? `[[ul]][[li]]x[[/li]]${source}[[/ul]]`
      : `[[ul]][[li]]${source}[[/li]][[/ul]]`;
    const ast = parse(input).ast;
    const html = renderToHtml(ast);
    expect(html.match(/href="mailto:a@b.com"/g)).toHaveLength(70_000);
  });
});
