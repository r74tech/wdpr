import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { htmlToAst, serialize } from "@wdprlib/decompiler";

const render = (source: string) => renderToHtml(parse(source).ast);
const services = (html: string) =>
  [...html.matchAll(/data-wdpr-social-site="([^"]+)"/g)].map((m) => m[1]);

describe("social bookmarks", () => {
  it("defaults to all supported services in name order", () => {
    expect(services(render("[[social]]"))).toEqual([
      "bluesky",
      "facebook",
      "hatena",
      "linkedin",
      "mastodon",
      "reddit",
      "x",
    ]);
    expect(render("[[social]]")).toContain('aria-disabled="true"');
  });
  it("preserves explicit order and duplicates, and omits unsupported services", () => {
    expect(services(render("[[SOCIAL Reddit, x, del.icio.us, FACEBOOK, x]]"))).toEqual([
      "reddit",
      "x",
      "facebook",
      "x",
    ]);
    expect(services(render("[[social ,]]"))).toEqual([]);
    expect(services(render("[[social \n ]]"))).toHaveLength(7);
  });
  it.each(["[[social]]", "[[social ,]]", "[[social x,unknown,hatena,x]]"])(
    "roundtrips syntax and generated HTML: %s",
    (source) => {
      const ast = parse(source).ast;
      expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
      const html = renderToHtml(ast);
      expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
    },
  );
  it.each([
    '[[social twitter, "one]]tail"]]',
    "[[social twitter, --]]tail",
    "[[social twitter, [[[one]]tail",
  ])("uses the first raw close: %s", (source) => {
    const html = render(source);
    expect(services(html)).toEqual(["twitter"]);
    expect(html).toContain("</span>tail");
  });
  it("protects a multiline directive in headings and formatting", () => {
    expect(render("+++ before [[social twitter,\n **]] after")).toContain(
      "</span> after</span></h3>",
    );
    expect(render("**before [[social twitter,**]] after**")).toContain("</span> after</strong>");
  });
  it.each(["[[social twitter]x]]", "[[socialx]]", "[[social twitter"])(
    "leaves invalid directives literal: %s",
    (source) => {
      expect(render(source)).not.toContain("data-wdpr-social=");
    },
  );
  it("leaves protected examples literal", () => {
    expect(render("@@[[social]]@@\n\n[[code]]\n[[social]]\n[[/code]]")).not.toContain(
      "data-wdpr-social=",
    );
  });
  it("does not classify an ordinary span as generated social markup", () => {
    const ast = htmlToAst('<p><span class="wdpr-social">keep me</span></p>');
    expect(serialize(ast)).toContain("keep me");
    expect(serialize(ast)).not.toContain("[[social");
  });
  it("preserves inactive anchor text when importing edited social markup", () => {
    expect(serialize(htmlToAst('<p><a>keep me</a><a href=""> too</a></p>'))).toContain(
      "keep me too",
    );
  });
  it("does not let a rejected prefix hide a later valid directive", () => {
    expect(services(render("[[social x] [[social hatena]]"))).toEqual(["hatena"]);
    expect(services(render("[[social x ".repeat(500) + "]bad]] [[social x]]"))).toEqual(["x"]);
  });
});
