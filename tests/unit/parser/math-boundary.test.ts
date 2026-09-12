import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

test.each(["[[/math", "[[/math extra]]", "[[/math_]]", "[[/math ]]"])(
  "math retains an incomplete or invalid close as body text: %s",
  (candidate) => {
    const { ast, diagnostics } = parse(`[[math]]\nx\n${candidate}\ny\n[[/math]]\nafter`);
    expect(diagnostics).toEqual([]);
    expect(ast.elements[0]).toEqual({
      element: "math",
      data: { name: null, "latex-source": `x\n${candidate}\ny` },
    });
    expect(renderToHtml(ast)).toEndWith("</div><p>after</p>");
  },
);

test.each(["label_1", "名前"])("math preserves labels and inline block boundaries: %s", (name) => {
  const { ast, diagnostics } = parse(`[[MaTh ${name} ]] x [[/MATH]]after`);
  expect(diagnostics).toEqual([]);
  expect(ast.elements[0]).toEqual({
    element: "math",
    data: { name, "latex-source": "x" },
  });
  expect(renderToHtml(ast)).toEndWith("</div><p>after</p>");
});

test("math preserves explicit backslash breaks and reports an absent complete close", () => {
  const { ast, diagnostics } = parse("[[math]]\nx\\\ny\n[[/math");
  expect(ast.elements[0]).toEqual({
    element: "math",
    data: { name: null, "latex-source": "x\\\ny\n[[/math" },
  });
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.code).toBe("unclosed-block");
});

test.each(["[[math]]\n[[/math]]", "[[math]] \t\n[[/math]]", "[[math_]]x[[/math]]"])(
  "empty math and underscore openers remain literal: %s",
  (source) => {
    expect(parse(source).ast.elements.some((element) => element.element === "math")).toBe(false);
  },
);

test.each(["code", "math"])("an unclosed %s retains permissive footnote recovery", (name) => {
  const { ast, diagnostics } = parse(`[[footnote]]\n[[${name}]]x[[/footnote]]after`);
  expect(diagnostics.map((d) => d.code)).toEqual(["unclosed-block", "unclosed-block"]);
  expect(ast.footnotes?.[0]?.[0]).toMatchObject({ element: name });
  expect(JSON.stringify(ast.footnotes)).toContain("x[[/footnote]]after");
});
