import { describe, expect, test } from "bun:test";
import {
  countCharacters,
  excerptText,
  extractReadableText,
  extractFirstParagraph,
} from "@wdprlib/ast";
import { definePageData, extractDataRequirements, parse, processWikitext } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { Window } from "happy-dom";
import { htmlToAst } from "@wdprlib/decompiler";

describe("readable text", () => {
  test.each([
    ["+ 見出し\n\n最初の**段落**。\n\n次の段落。", "最初の段落。"],
    ["[[include component]]\n\n次の段落。", "包含本文。"],
    ["+ 見出し\n\n[[#if 0 | 非表示 | 表示]]本文。", "表示本文。"],
    ["+ 見出しだけ", ""],
    ["[[code]]\nコードだけ\n[[/code]]", ""],
  ])("first paragraph retains paragraph semantics: %s", async (source, expected) => {
    const document = await processWikitext(source!, {
      page: { fullName: "test", tags: [] },
      dataProvider: { fetchInclude: async () => "+ 包含見出し\n\n包含本文。" },
    });
    expect(document.firstParagraph).toBe(expected);
    expect(document.characterCount).toBe(countCharacters(document.readableText));
  });

  test("first paragraph ignores excluded and empty paragraphs and appended footnotes", async () => {
    const document = await processWikitext(
      '+ 見出し\n[[div class="acs"]]\n除外本文\n[[/div]]\n\n[[$ x $]]\n\n本文[[footnote]]注釈[[/footnote]]\n\n次の段落。',
      {
        page: { fullName: "test", tags: [] },
        readableText: {
          exclude: (element) =>
            element.element === "container" && element.data.attributes.class === "acs",
        },
      },
    );
    expect(document.firstParagraph).toBe("本文");
    expect(document.readableText).toContain("注釈");
    expect(document.readableText).not.toContain("除外本文");
  });

  test.each([
    ["[[#if true | A | B]]C", "AC", "A", "C"],
    ["[[#if 0 | A | B]]C", "BC", "B", "C"],
    ["[[#ifexpr 1 | 前 | 別]]後", "前後", "前", "後"],
    ["[[#ifexpr 0 | 前 | 別]]後", "別後", "別", "後"],
    ["[[#if true | | B]]C", "C", "", "C"],
  ])("conditional branch padding is omitted: %s", async (source, expected, start, excerpt) => {
    const document = await processWikitext(source!, { page: { fullName: "test", tags: [] } });
    expect(document.readableText).toBe(expected);
    expect(document.characterCount).toBe(expected!.length);
    expect(excerptText(document.readableText, { start, maxLength: 1 })).toBe(excerpt);
  });

  test("extracts resolved body and labels while omitting syntax and duplicated UI", async () => {
    const source =
      "+ 見出し\n[[toc]]\n[[module CSS]]\n.secret {color:red}\n[[/module]]\n[[module Rate]]\n[[include component]]\n\n説明: **恐竜**です。次の文。\n[https://example.invalid 表示名]\n[[footnote]]注の本文[[/footnote]]\n[[footnoteblock]]\n[[tabview]]\n[[tab A]]\nタブA\n[[/tab]]\n[[tab B]]\nタブB\n[[/tab]]\n[[/tabview]]\n[[collapsible]]\n閉じた本文\n[[/collapsible]]\n[[code]]\nconst x = 1;\n[[/code]]\n[[$ \\alpha $]]";
    const doc = await processWikitext(source, {
      page: { fullName: "test", tags: [] },
      dataProvider: { fetchInclude: async () => "展開した本文" },
    });
    const text = extractReadableText(doc.ast);
    expect(text).toBe(doc.readableText);
    expect(doc.characterCount).toBe(countCharacters(text));
    for (const part of [
      "見出し",
      "展開した本文",
      "説明: 恐竜です。",
      "表示名",
      "タブA",
      "タブB",
      "閉じた本文",
      "const x = 1;",
    ])
      expect(text).toContain(part);
    expect(text.match(/注の本文/g)).toHaveLength(1);
    expect(text.match(/見出し/g)).toHaveLength(1);
    expect(text).toContain("A\n\nタブA");
    expect(text).not.toContain("undefined");
    for (const part of [".secret", "example.invalid", "module", "include", "alpha", "Footnotes"])
      expect(text).not.toContain(part);
    expect(excerptText(text, { start: "説明: ", end: "。", maxLength: 200 })).toBe("恐竜です。");
  });

  test("exclusions preserve the association of later footnotes", () => {
    const ast = parse(
      '[[div class="acs"]]\n除外[[footnote]]除外注[[/footnote]]\n[[/div]]\n本文[[footnote]]本文注[[/footnote]]',
    ).ast;
    expect(
      extractReadableText(ast, {
        exclude: (element) =>
          element.element === "container" && element.data.attributes.class === "acs",
      }),
    ).toBe("本文\n\n本文注");
  });

  test("resolved include children contribute text and preserve later footnote associations", () => {
    const ast = parse(
      "展開済み本文。[[footnote]]包含注[[/footnote]]\n\n後続[[footnote]]後続注[[/footnote]]",
    ).ast;
    const included = ast.elements.shift()!;
    ast.elements.unshift({
      element: "include",
      data: {
        "paragraph-safe": false,
        variables: {},
        location: { site: null, page: "component" },
        elements: [included],
      },
    });
    const text = extractReadableText(ast);
    expect(text).toBe("展開済み本文。\n\n後続\n\n包含注\n\n後続注");
    expect(countCharacters(text)).toBe(21);
    expect(extractFirstParagraph(ast)).toBe("展開済み本文。");
    expect(extractReadableText(ast, { exclude: (element) => element.element === "include" })).toBe(
      "後続\n\n後続注",
    );
  });

  test("anchor text and footnotes preserve their association when a link is excluded", async () => {
    const document = await processWikitext(
      '[[a href="/x"]]表示名[[footnote]]リンク注[[/footnote]][[/a]]\n\n本文[[footnote]]本文注[[/footnote]]',
      { page: { fullName: "test", tags: [] } },
    );
    expect(document.readableText).toBe("表示名\n\n本文\n\nリンク注\n\n本文注");
    expect(
      extractReadableText(document.ast, { exclude: (element) => element.element === "anchor" }),
    ).toBe("本文\n\n本文注");
  });

  test("explicit footnote references from HTML conversion include each note once", () => {
    const ast = parse("本文[[footnote]]脚注[[/footnote]]").ast;
    const converted = htmlToAst(renderToHtml(ast));
    expect(extractReadableText(converted)).toBe(extractReadableText(ast));
    converted.elements.push({ element: "footnote-ref", data: 1 });
    expect(extractReadableText(converted)).toBe("本文\n\n脚注");
  });

  test("graphemes are not split, and absent delimiters and invalid lengths are explicit", () => {
    const text = "Aか\u3099👨‍👩‍👧‍👦🇯🇵。末尾";
    expect(countCharacters(text)).toBe(7);
    expect(countCharacters("")).toBe(0);
    expect(excerptText("か\u3099次", { start: "か" })).toBe("次");
    expect(excerptText("家族👨‍👩‍👧‍👦。", { end: "👨" })).toBe("家族👨‍👩‍👧‍👦");
    expect(excerptText(text, { maxLength: 3 })).toBe("Aか\u3099👨‍👩‍👧‍👦");
    expect(excerptText(text, { start: "見つからない", maxLength: 10 })).toBe("");
    expect(excerptText(text, { start: "A", end: "?", maxLength: 2 })).toBe("か\u3099👨‍👩‍👧‍👦");
    expect(excerptText("説明: 終わり。続き。", { start: "説明: ", end: "。" })).toBe("終わり。");
    for (const length of [0, -1, NaN, Infinity])
      expect(excerptText(text, { maxLength: length })).toBe("");
    expect(excerptText(text, { maxLength: Number.MAX_SAFE_INTEGER })).toBe(text);
  });

  test("ListPages requests readable text and never executes text from previews or excerpts", async () => {
    const source =
      "[[module ListPages]]\n%%excerpt{説明: }(80)|。%%\n%%preview(80)%%\n%%summary%%\n%%first_paragraph%%\n%%size%%\n[[/module]]";
    expect(
      extractDataRequirements(parse(source).ast).requirements.listPages[0]?.needsReadableText,
    ).toBe(true);
    const readableText = "説明: [[include secret]] @@ >@ 恐竜。続き";
    let includeCalls = 0;
    const doc = await processWikitext(source, {
      page: { fullName: "index", tags: [] },
      dataProvider: {
        fetchInclude: async () => {
          includeCalls++;
          return "LEAK";
        },
        fetchListPages: async () => ({
          pages: [
            definePageData({
              fullname: "one",
              title: "One",
              tags: [],
              createdAt: new Date(0),
              updatedAt: new Date(0),
              content: "WRONG SOURCE",
              readableText,
              firstParagraph: readableText,
            }),
          ],
          totalCount: 1,
          site: { name: "test", title: "Test", domain: "test.invalid" },
        }),
      },
    });
    const dom = new Window().document;
    dom.body.innerHTML = renderToHtml(doc.ast);
    expect(includeCalls).toBe(0);
    expect(dom.body.textContent).toContain("[[include secret]] @@ >@ 恐竜。");
    expect(dom.body.textContent).toContain(String(countCharacters(readableText)));
    expect(dom.body.textContent).not.toContain("WRONG SOURCE");
  });
});
