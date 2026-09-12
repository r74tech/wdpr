import { expect, test } from "bun:test";
import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { decompile } from "@wdprlib/decompiler";
import { RenderOutputBuffer } from "../../../packages/render/src/context/output";

const equation = (name = "", body = "x = 1") => `[[math ${name}]]\n${body}\n[[/math]]`;
const render = (source: string) => renderToHtml(parse(source).ast);

test("numbers every block and resolves references before and after their equation", () => {
  const html = render(
    `[[eref sample]]\n\n${equation()}\n\n${equation("sample")}\n\n([[eref sample]])\n\n${equation("", "\\begin{align}E=mc^2\\end{align}")}`,
  );
  expect(html.match(/class="equation-number">\(\d+\)/g)).toEqual([
    'class="equation-number">(1)',
    'class="equation-number">(2)',
    'class="equation-number">(3)',
  ]);
  expect(html.match(/href="#equation-2">2<\/a>/g)).toHaveLength(2);
});

test("duplicate labels refer to the last equation with unique numeric IDs", () => {
  const html = render(`${equation("same")}\n\n[[eref same]]\n\n${equation("same")}`);
  expect(html).toContain('id="equation-1"');
  expect(html).toContain('id="equation-2"');
  expect(html).toContain('href="#equation-2">2</a>');
});

test.each([true, false])(
  "does not link an undefined numeric label with true IDs=%s",
  (useTrueIds) => {
    const html = renderToHtml(parse(`[[eref 1]]\n\n${equation("sample")}\n\n[[eref sample]]`).ast, {
      settings: { ...DEFAULT_SETTINGS, useTrueIds },
    });
    expect(html).toContain('<span class="eref" data-name="1">1</span>');
    const id = /id="(equation-1[^"]*)"/.exec(html)?.[1];
    expect(id).toBeDefined();
    expect(html).toContain(`href="#${id}">1</a>`);
  },
);

test("uses only rendered branches and ignores code and raw examples", () => {
  const source = `@@[[math raw]]@@\n\n[[code]]\n${equation("code")}\n[[/code]]\n\n[[iftags +hidden]]\n${equation("hidden")}\n[[/iftags]]\n\n[[div]]\n${equation("shown")}\n[[/div]]\n\n[[eref shown]]`;
  const ast = parse(source).ast;
  const options = { page: { pageName: "test", tags: [] } };
  const html = renderToHtml(ast, options);
  expect(html.match(/class="equation-number"/g)).toHaveLength(1);
  expect(html).toContain('href="#equation-1">1</a>');
  expect(renderToHtml(ast, options)).toBe(html);
});

test("preserves labels through HTML decompilation, including math directly inside footnotes", () => {
  const source = `[[eref sample]] [[eref missing]]\n\n[[footnote]]\n${equation("sample")}\n[[eref sample]]\n[[/footnote]]`;
  const html = render(source);
  expect(html).toContain('href="#equation-1">1</a>');
  const restored = decompile(html);
  expect(restored).toContain("[[math sample]]");
  expect(restored).toContain("[[eref sample]]");
  expect(restored).toContain("[[eref missing]]");
  const roundtrip = render(restored);
  expect(roundtrip.match(/class="equation-number"/g)).toHaveLength(1);
  expect(roundtrip.match(/href="#equation-1">1<\/a>/g)).toHaveLength(2);
});

test("preserves ordinary inline footnote markup during HTML decompilation", () => {
  const restored = decompile(render("text[[footnote]]**bold** and //italic//[[/footnote]]"));
  expect(restored).toContain("**bold**");
  expect(restored).toContain("//italic//");
});

test("collection output does not retain or evaluate deferred references", () => {
  const output = new RenderOutputBuffer(true);
  output.pushDeferred(() => {
    throw new Error("collection callback evaluated");
  });
  expect(output.getOutput()).toBe("");
});
