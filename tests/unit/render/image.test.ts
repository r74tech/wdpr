import { describe, expect, it } from "bun:test";
import type { ImageData, SyntaxTree } from "@wdprlib/ast";
import { renderToHtml } from "@wdprlib/render";

function renderImage(attributes: Record<string, string>): string {
  const data: ImageData = {
    source: { type: "url", data: "https://example.com/art.jpg" },
    link: null,
    alignment: null,
    attributes,
  };
  const tree: SyntaxTree = { elements: [{ element: "image", data }] };
  return renderToHtml(tree);
}

describe("renderImage: size", () => {
  it("converts supported presets to display widths", () => {
    for (const [size, width] of [
      ["square", "75"],
      ["thumbnail", "100"],
      ["small", "240"],
      ["medium", "500"],
      ["medium640", "640"],
      ["large", "1024"],
    ]) {
      const html = renderImage({ size });
      expect(html).toContain(`width="${width}"`);
      expect(html).not.toContain("size=");
      expect(html).toContain('src="https://example.com/art.jpg"');
    }
  });

  it("keeps an explicit width instead of the size preset", () => {
    const html = renderImage({ size: "medium", width: "320" });

    expect(html).toContain('width="320"');
    expect(html).not.toContain('width="500"');
    expect(html).not.toContain("size=");
  });

  it("drops unsupported size values", () => {
    for (const size of ["original", "unknown", "", "中"]) {
      const html = renderImage({ size });
      expect(html).not.toContain("size=");
      expect(html).not.toContain("width=");
    }
  });
});
