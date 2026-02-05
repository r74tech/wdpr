import { describe, test, expect } from "bun:test";
import { renderEmbedBlock } from "../../../packages/render/src/elements/embed-block";
import { RenderContext } from "../../../packages/render/src/context";
import type { SyntaxTree } from "@wdprlib/ast";

function createContext(): RenderContext {
  const tree: SyntaxTree = { elements: [] };
  return new RenderContext(tree);
}

function renderEmbed(contents: string): string {
  const ctx = createContext();
  renderEmbedBlock(ctx, { contents });
  return ctx.getOutput();
}

describe("embed-block DOMPurify sanitization", () => {
  test("allows valid YouTube iframe", () => {
    const input =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("youtube.com/embed");
    expect(result).not.toContain("error-block");
  });

  test("allows valid Vimeo iframe", () => {
    const input =
      '<iframe src="https://player.vimeo.com/video/76979871" width="640" height="360"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("vimeo.com");
    expect(result).not.toContain("error-block");
  });

  test("blocks iframe with srcdoc attribute", () => {
    const input = '<iframe srcdoc="<script>alert(1)</script>" width="100" height="100"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("blocks iframe with javascript: src", () => {
    const input = '<iframe src="javascript:alert(1)" width="100" height="100"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("blocks iframe with data: src", () => {
    const input =
      '<iframe src="data:text/html,<script>alert(1)</script>" width="100" height="100"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("blocks iframe with onerror handler", () => {
    const input = '<iframe src="https://example.com" onerror="alert(1)"></iframe>';
    const result = renderEmbed(input);
    // DOMPurify removes the onerror attribute
    expect(result).not.toContain("onerror");
  });

  test("blocks script tags", () => {
    const input = "<script>alert(1)</script>";
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("blocks non-allowlisted content", () => {
    const input = "<div>Some random content</div>";
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("blocks http:// (non-https) iframe src", () => {
    const input =
      '<iframe src="http://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>';
    const result = renderEmbed(input);
    expect(result).toContain("error-block");
  });

  test("preserves allowfullscreen attribute", () => {
    const input = '<iframe src="https://www.youtube.com/embed/test" allowfullscreen></iframe>';
    const result = renderEmbed(input);
    // DOMPurify normalizes boolean attributes to attr="" format
    expect(result).toContain("allowfullscreen");
  });
});
