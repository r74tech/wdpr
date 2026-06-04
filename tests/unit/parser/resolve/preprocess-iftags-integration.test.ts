import { describe, expect, it } from "bun:test";
import { parse, preprocessIftags } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

/**
 * End-to-end coverage for the source-level `[[iftags]]` preprocessor.
 *
 * The point of `preprocessIftags` is to expand iftags BEFORE block-level
 * parsing, so it has to combine with `parse` + `renderToHtml` to handle
 * cases the AST-level resolver cannot — most notably an `[[iftags]]`
 * embedded inside another block's attribute string. Once preprocess has
 * collapsed the iftags, the resulting source is well-formed wikitext
 * the parser can lex normally.
 */
describe("preprocessIftags + parse + render integration", () => {
  function pipeline(source: string, tags: string[] | null): string {
    const preprocessed = preprocessIftags(source, tags);
    const { ast } = parse(preprocessed);
    return renderToHtml(ast);
  }

  it("expands an iftags embedded in a block opener attribute (matching tag)", () => {
    const src =
      `[[div_ class="x" [[iftags +foo]]style="display:none;"[[/iftags]]]]\n` +
      `inner\n` +
      `[[/div]]`;
    const html = pipeline(src, ["foo"]);
    expect(html).toContain(`class="x"`);
    expect(html).toContain(`style="display:none;"`);
    expect(html).toContain("inner");
  });

  it("collapses an iftags embedded in a block opener attribute (non-matching tag)", () => {
    const src =
      `[[div_ class="x" [[iftags +foo]]style="display:none;"[[/iftags]]]]\n` +
      `inner\n` +
      `[[/div]]`;
    const html = pipeline(src, []);
    expect(html).toContain(`class="x"`);
    expect(html).not.toContain("display:none");
    expect(html).toContain("inner");
  });

  it("preprocessing a body that contains a nested iftags works end-to-end", () => {
    const src = `[[div_]]\n` + `[[iftags +a]]A[[iftags +b]]B[[/iftags]][[/iftags]]\n` + `[[/div]]`;
    const html = pipeline(src, ["a", "b"]);
    expect(html).toContain("AB");
  });

  it("leaves [[iftags]] inside [[code]] alone (not preprocessed, not rendered as block)", () => {
    const src = `[[code]]\n[[iftags +foo]]X[[/iftags]]\n[[/code]]`;
    const html = pipeline(src, ["foo"]);
    // The literal iftags text remains inside the code block output.
    expect(html).toContain("[[iftags +foo]]X[[/iftags]]");
  });

  it("falls back to AST-level handling when pageTags is null", () => {
    // null pageTags → preprocess is a no-op. The AST-level [[iftags]]
    // block rule still parses the construct (and resolveModules would
    // evaluate it later). At this layer (no resolveModules call) the
    // if-tags element ends up in the AST with its body preserved.
    const src = `[[iftags +foo]]body[[/iftags]]`;
    const preprocessed = preprocessIftags(src, null);
    expect(preprocessed).toBe(src);
    const { ast } = parse(preprocessed);
    expect(JSON.stringify(ast)).toContain("if-tags");
  });
});
