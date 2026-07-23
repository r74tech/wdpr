import { describe, expect, it } from "bun:test";
import { STYLE_ANCHOR_PREFIX } from "@wdprlib/ast";
import { serialize } from "@wdprlib/decompiler";
import { parse, resolveModules } from "@wdprlib/parser";

describe("serialize resolved styles", () => {
  it("omits synthetic style anchors from serialized wikitext", async () => {
    const source = ["[[module CSS]]", ".example { color: red; }", "[[/module]]", "content"].join(
      "\n",
    );
    const ast = parse(source).ast;
    const resolved = await resolveModules(
      ast,
      {},
      {
        parse: (input) => parse(input).ast,
        compiledListPagesTemplates: new Map(),
        requirements: {},
      },
    );

    expect(
      resolved.elements.some(
        (element) => element.element === "style" && element.data.startsWith(STYLE_ANCHOR_PREFIX),
      ),
    ).toBe(true);

    const serialized = serialize(resolved);

    expect(serialized).toBe("content\n");
    expect(serialized).not.toContain(STYLE_ANCHOR_PREFIX);
    expect(parse(serialized).diagnostics).toEqual([]);
  });
});
