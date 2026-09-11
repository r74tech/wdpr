import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

test("decoded angle raw remains escaped HTML text", () => {
  const { ast } = parse("@<&lt;script&gt;alert(1)&lt;/script&gt;>@");
  expect(ast.elements[0]).toEqual({
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements: [{ element: "raw", data: "<script>alert(1)</script>" }],
    },
  });
  expect(renderToHtml(ast)).toBe(
    '<p><span style="white-space: pre-wrap;">&lt;script&gt;alert(1)&lt;/script&gt;</span></p>',
  );
});
