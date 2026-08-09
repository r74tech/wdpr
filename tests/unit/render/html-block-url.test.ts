import { describe, expect, it } from "bun:test";
import type { SyntaxTree, Element } from "@wdprlib/ast";
import { renderToHtml } from "@wdprlib/render";

describe("htmlBlockUrl callback", () => {
  const createTreeWithHtmlBlocks = (htmlBlocks: string[]): SyntaxTree => ({
    elements: htmlBlocks.map((contents) => ({
      element: "html",
      data: { contents },
    })) as Element[],
    "html-blocks": htmlBlocks,
  });

  it("should use callback URL when htmlBlockUrl is provided", () => {
    const tree = createTreeWithHtmlBlocks(["<p>Hello</p>", "<p>World</p>"]);
    const urls = [
      "https://files.example.com/html/page/abc",
      "https://files.example.com/html/page/def",
    ];

    const html = renderToHtml(tree, {
      resolvers: { htmlBlockUrl: (index) => urls[index] },
    });

    expect(html).toContain('src="https://files.example.com/html/page/abc"');
    expect(html).toContain('src="https://files.example.com/html/page/def"');
  });

  it("should use default URL when callback is not provided", () => {
    const tree = createTreeWithHtmlBlocks(["<p>Test</p>"]);

    const html = renderToHtml(tree, {
      page: { pageName: "test-page" },
    });

    // Default pattern: /{pageName}/html/{hash}-{nonce}
    expect(html).toMatch(/src="\/test-page\/html\/[a-f0-9]+-\d+"/);
  });

  it("should use default URL when callback returns empty string", () => {
    const tree = createTreeWithHtmlBlocks(["<p>Test</p>"]);

    const html = renderToHtml(tree, {
      page: { pageName: "test-page" },
      resolvers: { htmlBlockUrl: () => "" },
    });

    // Should fall back to default pattern
    expect(html).toMatch(/src="\/test-page\/html\/[a-f0-9]+-\d+"/);
  });

  it("should generate valid URL when pageName is empty (avoid protocol-relative URL)", () => {
    const tree = createTreeWithHtmlBlocks(["<p>Test</p>"]);

    const html = renderToHtml(tree, {
      // No page context, so pageName defaults to empty string
    });

    // Should be /html/... not //html/...
    expect(html).toMatch(/src="\/html\/[a-f0-9]+-\d+"/);
    expect(html).not.toContain('src="//');
  });

  it("should preserve iframe security attributes", () => {
    const tree = createTreeWithHtmlBlocks(["<script>alert(1)</script>"]);

    const html = renderToHtml(tree, {
      resolvers: { htmlBlockUrl: () => "https://files.example.com/html/test" },
      htmlBlockSandbox: "allow-same-origin",
    });

    expect(html).toContain('sandbox="allow-same-origin"');
    expect(html).toContain('class="html-block-iframe"');
    expect(html).toContain('allowtransparency="true"');
    expect(html).toContain('frameborder="0"');
  });

  it.each([
    { name: "omitted", options: {}, expected: ' sandbox=""' },
    {
      name: "explicit undefined",
      options: { htmlBlockSandbox: undefined },
      expected: ' sandbox=""',
    },
    { name: "empty string", options: { htmlBlockSandbox: "" }, expected: ' sandbox=""' },
    { name: "explicit null opt-out", options: { htmlBlockSandbox: null }, expected: null },
    {
      name: "permission tokens",
      options: { htmlBlockSandbox: "allow-scripts" },
      expected: ' sandbox="allow-scripts"',
    },
  ])("uses the safe sandbox behavior for $name", ({ options, expected }) => {
    const tree = createTreeWithHtmlBlocks(["<p>Test</p>"]);
    const html = renderToHtml(tree, options);

    if (expected === null) {
      expect(html).not.toContain(" sandbox=");
    } else {
      expect(html).toContain(expected);
    }
  });

  it("should increment index for each htmlBlock", () => {
    const tree = createTreeWithHtmlBlocks(["<p>1</p>", "<p>2</p>", "<p>3</p>"]);
    const receivedIndexes: number[] = [];

    renderToHtml(tree, {
      resolvers: {
        htmlBlockUrl: (index) => {
          receivedIndexes.push(index);
          return `https://example.com/${index}`;
        },
      },
    });

    expect(receivedIndexes).toEqual([0, 1, 2]);
  });

  it("passes block content as a backward-compatible second argument", () => {
    const tree = createTreeWithHtmlBlocks(["<p>one</p>", "<p>two</p>"]);
    const received: Array<[number, string]> = [];

    renderToHtml(tree, {
      resolvers: {
        htmlBlockUrl: (index, content) => {
          received.push([index, content]);
          return `https://example.com/${index}`;
        },
      },
    });

    expect(received).toEqual([
      [0, "<p>one</p>"],
      [1, "<p>two</p>"],
    ]);
  });
});
