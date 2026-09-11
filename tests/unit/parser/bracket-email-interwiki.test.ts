import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";
import { tokenize } from "../../../packages/parser/src/lexer";
import { createParseContext } from "../../../packages/parser/src/parser/parse/context";
import { parseSingleBracketLink } from "../../../packages/parser/src/parser/rules/inline/link-bracket/parsed";

describe("bracket emails and Wikipedia links", () => {
  it("does not consume a closing bracket outside the inline scope", () => {
    const tokens = tokenize("[support@example.com label]");
    const ctx = createParseContext(tokens);
    ctx.scope.inlineEnd = tokens.findIndex((token) => token.type === "BRACKET_CLOSE");
    expect(parseSingleBracketLink(ctx)).toBeNull();
  });
  it.each([
    ["[support@example.com email me!]", 'href="mailto:support@example.com"', "email me!"],
    [
      "[wikipedia:Albert_Einstein]",
      'href="http://en.wikipedia.org/wiki/Albert_Einstein"',
      "Albert_Einstein",
    ],
    [
      "[wikipedia:Albert_Einstein Albert]",
      'href="http://en.wikipedia.org/wiki/Albert_Einstein"',
      "Albert",
    ],
    [
      "[wikipedia:it:Albert_Einstein Albert]",
      'href="http://en.wikipedia.org/wiki/it:Albert_Einstein"',
      "Albert",
    ],
  ])("renders %s", (source, href, label) => {
    const ast = parse(source).ast;
    const html = renderToHtml(ast);
    expect(html).toContain(href);
    expect(html).toContain(`>${label}</a>`);
    if (source.includes("wikipedia:")) expect(html).toContain('target="_blank"');
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
  });

  it("keeps triple-bracket interwiki target semantics on serialization", () => {
    const ast = parse("[[[wikipedia:Albert Einstein|Albert]]]").ast;
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
  });

  it("preserves a pipe in a triple interwiki label", () => {
    const ast = parse("[[[wikipedia:Page|A|B]]]").ast;
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
  });

  it("preserves visible text when a label cannot safely be serialized as a link", () => {
    const result = serialize({
      elements: [
        {
          element: "link",
          data: {
            type: "interwiki",
            link: "wikipedia:Page",
            label: { text: "[label" },
            target: null,
            extra: null,
          },
        },
      ],
    });
    expect(result).toContain("label");
    expect(renderToHtml(parse(result).ast)).toContain("[label");
  });

  it.each(["[wikipedia:]", "[wikipedia::page]"])(
    "rejects an invalid single target: %s",
    (source) => {
      expect(renderToHtml(parse(source).ast)).not.toContain("<a ");
    },
  );

  it("accepts Wikipedia subpages", () => {
    expect(renderToHtml(parse("[wikipedia:User:Example/Sandbox]").ast)).toContain(
      'href="http://en.wikipedia.org/wiki/User:Example/Sandbox"',
    );
  });

  it.each(["[https://example.com Label]", "[*https://example.com Label]", "[#anchor Label]"])(
    "preserves existing bracket forms in compact mode: %s",
    (source) => {
      const normal = renderToHtml(parse(source).ast);
      const compact = renderToHtml(parse("plain ".repeat(20_000) + "\n\n" + source).ast);
      expect(compact).toEndWith(normal);
    },
  );

  it("does not accept mail headers or unknown schemes", () => {
    const html = renderToHtml(parse("[a%0d%0abcc:evil@example.com mail] [unknown:page label]").ast);
    expect(html).not.toContain("<a ");
  });

  it("keeps raw examples and explicit labels literal", () => {
    const html = renderToHtml(
      parse(
        "@@[support@example.com email me!]@@ @@[wikipedia:Albert_Einstein]@@ [https://example.com support@example.com]",
      ).ast,
    );
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain(">support@example.com</a>");
  });

  it("uses the same bracket parts in compact text mode", () => {
    const source =
      "plain ".repeat(20_000) +
      "\n\n[support@example.com email me!] [wikipedia:Albert_Einstein Albert]";
    const html = renderToHtml(parse(source).ast);
    expect(html).toContain('href="mailto:support@example.com">email me!</a>');
    expect(html).toContain('href="http://en.wikipedia.org/wiki/Albert_Einstein"');
    expect(html).toContain(">Albert</a>");
  });
});
