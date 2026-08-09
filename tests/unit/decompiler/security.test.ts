import { describe, expect, test } from "bun:test";
import type { SyntaxTree } from "@wdprlib/ast";
import { decompile, serialize } from "@wdprlib/decompiler";
import { parse } from "@wdprlib/parser";

describe("decompiler directive boundaries", () => {
  test("unsafe container attributes cannot terminate the directive", () => {
    const source = decompile(`<div style='x"]] SENTINEL [[div style="y'>content</div>`);

    expect(source).toBe("[[div_]]\ncontent\n[[/div]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "div",
            attributes: {},
            elements: [{ element: "text", data: "content" }],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe iframe URLs omit the entire directive", () => {
    const source = decompile(
      `<iframe src="x]]\nSENTINEL [[iframe https://evil.example]]\n[["></iframe>`,
    );

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe image sources omit the entire directive", () => {
    const source = decompile(
      `<img src="x]]\nSENTINEL [[iframe https://evil.example]]\n[[image y">`,
    );

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe image attributes are omitted", () => {
    const source = decompile(`<img src="x" alt='y" ]] SENTINEL [[iframe evil ]] [[image z="'>`);

    expect(source).toBe("[[image x]]");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              {
                element: "image",
                data: {
                  source: { type: "file1", data: { file: "x" } },
                  link: null,
                  alignment: null,
                  attributes: {},
                },
              },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe iframe attributes are omitted", () => {
    const source = decompile(
      `<iframe src="https://example.com" style='x" ]] SENTINEL [[iframe evil ]] [[iframe y="'></iframe>`,
    );

    expect(source).toBe("[[iframe https://example.com]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        { element: "iframe", data: { url: "https://example.com", attributes: {} } },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe collapsible labels are omitted without breaking the block", () => {
    const source = decompile(
      `<div class="collapsible-block"><div class="collapsible-block-folded"><a class="collapsible-block-link">+ show" ]] SENTINEL [[collapsible show="x</a></div><div class="collapsible-block-unfolded"><div class="collapsible-block-unfolded-link"><a class="collapsible-block-link">- hide</a></div><div class="collapsible-block-content">body</div></div></div>`,
    );

    expect(source).toBe(`[[collapsible hide="hide"]]\nbody\n[[/collapsible]]\n`);
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "collapsible",
          data: {
            elements: [
              {
                element: "container",
                data: {
                  type: "paragraph",
                  attributes: {},
                  elements: [{ element: "text", data: "body" }],
                },
              },
            ],
            attributes: {},
            "start-open": false,
            "show-text": null,
            "hide-text": "hide",
            "show-top": true,
            "show-bottom": false,
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe tab labels omit the tab view", () => {
    const source = decompile(
      `<div class="yui-navset"><ul class="yui-nav"><li><a><em>x]] SENTINEL [[tab y</em></a></li></ul><div class="yui-content"><div>body</div></div></div>`,
    );

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test.each(["[[/MaTh]]", "[[/math x]]", "[[/math!]]"])(
    "math close candidate %s omits the entire block",
    (closeCandidate) => {
      const source = decompile(
        `<div class="math-block"><code class="math-source">x ${closeCandidate}\nSENTINEL [[iframe https://evil.example]]\ny</code></div>`,
      );

      expect(source).toBe("");
      expect(parse(source).ast).toEqual({
        elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
      });
      expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
    },
  );

  test("unsafe math names are omitted", () => {
    const source = decompile(
      `<div class="math-block" data-name="x]] SENTINEL [[math y"><code class="math-source">x</code></div>`,
    );

    expect(source).toBe("[[math]] x [[/math]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        { element: "math", data: { name: null, "latex-source": "x" } },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test.each(["[[/MoDuLe x]]", "[[/module654]]", "[[/module!]]", "[[/module654!]]"])(
    "module close candidate %s omits unsafe style blocks",
    (closeCandidate) => {
      const source = decompile(
        `<style>body{}${closeCandidate}\nSENTINEL [[iframe https://evil.example]]</style>`,
      );

      expect(source).toBe("");
      expect(parse(source).ast).toEqual({
        elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
      });
      expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
    },
  );

  test.each(["[[/CoDe x]]", "[[/code!]]"])(
    "code close candidate %s omits unsafe code blocks",
    (closeCandidate) => {
      const source = decompile(
        `<div class="code"><pre><code>safe ${closeCandidate}\nSENTINEL [[iframe https://evil.example]]</code></pre></div>`,
      );

      expect(source).toBe("");
      expect(parse(source).ast).toEqual({
        elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
      });
      expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
    },
  );

  test.each([
    {
      name: "code identifier prefix",
      marker: "[[/codeblock]]",
      tree: {
        elements: [
          {
            element: "code" as const,
            data: { contents: "[[/codeblock]]", language: null, name: null },
          },
        ],
      } satisfies SyntaxTree,
    },
    {
      name: "math identifier prefix",
      marker: "[[/mathematics]]",
      tree: {
        elements: [
          {
            element: "math" as const,
            data: { "latex-source": "[[/mathematics]]", name: null },
          },
        ],
      } satisfies SyntaxTree,
    },
    {
      name: "module identifier prefix",
      marker: "[[/modulex]]",
      tree: {
        elements: [{ element: "style" as const, data: "[[/modulex]]" }],
      } satisfies SyntaxTree,
    },
    {
      name: "embed identifier prefix",
      marker: "[[/embedder]]",
      tree: {
        elements: [{ element: "embed-block" as const, data: { contents: "[[/embedder]]" } }],
      } satisfies SyntaxTree,
    },
  ])("$name does not match a shorter close name", ({ marker, tree }) => {
    expect(serialize(tree)).toContain(marker);
  });

  test("directive-looking text is serialized as visible literal text", () => {
    const source = decompile(`<p>[[iframe https://evil.example]]</p>`);

    expect(source).toBe("@@[[@@iframe https://evil.example]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "raw", data: "[[" },
              { element: "text", data: "iframe" },
              { element: "text", data: " " },
              { element: "text", data: "https" },
              { element: "text", data: ":" },
              { element: "text", data: "//" },
              { element: "text", data: "evil" },
              { element: "text", data: "." },
              { element: "text", data: "example" },
              { element: "text", data: "]]" },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
  });

  test("directive boundaries split across HTML nodes stay inert", () => {
    const source = decompile(`<p>[<!-- split -->[iframe https://evil.example]]</p>`);

    expect(source).toBe("@@[[@@iframe https://evil.example]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "raw", data: "[[" },
              { element: "text", data: "iframe" },
              { element: "text", data: " " },
              { element: "text", data: "https" },
              { element: "text", data: ":" },
              { element: "text", data: "//" },
              { element: "text", data: "evil" },
              { element: "text", data: "." },
              { element: "text", data: "example" },
              { element: "text", data: "]]" },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
  });

  test.each([
    { elements: ["@", "@x@@"], expectedText: "@@x@@" },
    { elements: ["@", "<x>@"], expectedText: "@<x>@" },
    {
      elements: ["[[", "[iframe https://evil.example]]"],
      expectedText: "[[[iframe https://evil.example]]",
    },
    { elements: ["@@", "@x@@"], expectedText: "@@@x@@" },
    { elements: ["@<", "@x>@"], expectedText: "@<@x>@" },
  ])("raw boundary split across AST text nodes stays inert", ({ elements, expectedText }) => {
    const source = serialize({
      elements: elements.map((data) => ({ element: "text" as const, data })),
    });
    const reparsed = parse(source).ast;

    expect(JSON.stringify(reparsed)).not.toContain('"element":"iframe"');
    expect(renderTextContent(reparsed)).toBe(expectedText);
  });

  test.each([
    {
      text: "[[module CSS]]body{}[[/module]]",
      expectedSource: "@@[[@@module CSS]]body{}@@[[@@/module]]\n",
      expectedElements: [
        { element: "raw" as const, data: "[[" },
        { element: "text" as const, data: "module" },
        { element: "text" as const, data: " " },
        { element: "text" as const, data: "CSS" },
        { element: "text" as const, data: "]]" },
        { element: "text" as const, data: "body" },
        { element: "text" as const, data: "{" },
        { element: "text" as const, data: "}" },
        { element: "raw" as const, data: "[[" },
        { element: "text" as const, data: "/" },
        { element: "text" as const, data: "module" },
        { element: "text" as const, data: "]]" },
      ],
    },
    {
      text: "[[/div]] SENTINEL [[iframe https://evil.example]]",
      expectedSource: "@@[[@@/div]] SENTINEL @@[[@@iframe https://evil.example]]\n",
      expectedElements: [
        { element: "raw" as const, data: "[[" },
        { element: "text" as const, data: "/" },
        { element: "text" as const, data: "div" },
        { element: "text" as const, data: "]]" },
        { element: "text" as const, data: " " },
        { element: "text" as const, data: "SENTINEL" },
        { element: "text" as const, data: " " },
        { element: "raw" as const, data: "[[" },
        { element: "text" as const, data: "iframe" },
        { element: "text" as const, data: " " },
        { element: "text" as const, data: "https" },
        { element: "text" as const, data: ":" },
        { element: "text" as const, data: "//" },
        { element: "text" as const, data: "evil" },
        { element: "text" as const, data: "." },
        { element: "text" as const, data: "example" },
        { element: "text" as const, data: "]]" },
      ],
    },
  ])(
    "directive boundary text $text stays visible and inert",
    ({ text, expectedSource, expectedElements }) => {
      const source = decompile(`<p>${text}</p>`);

      expect(source).toBe(expectedSource);
      expect(parse(source).ast).toEqual({
        elements: [
          {
            element: "container",
            data: {
              type: "paragraph",
              attributes: {},
              elements: expectedElements,
            },
          },
          { element: "footnote-block", data: { title: null, hide: false } },
        ],
      });
    },
  );

  test("raw delimiter collisions stay inside literal text", () => {
    const source = decompile(
      `<p><span style="white-space: pre-wrap;">a@@b [[iframe https://evil.example]]</span></p>`,
    );

    expect(source).toBe("@@a@@@<@@>@@@b [[iframe https://evil.example]]@@\n");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "raw", data: "a" },
              { element: "raw", data: "@@" },
              { element: "raw", data: "b [[iframe https://evil.example]]" },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
  });

  test("all raw delimiter forms are split into inert literal fragments", () => {
    const source = serialize({
      elements: [{ element: "raw", data: "a@<b>@c@@d" }],
    });

    expect(source).toBe("@@a@@@@@<@@@@b@@@@>@@@@@c@@@<@@>@@@d@@");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "raw", data: "a" },
              { element: "raw", data: "@<" },
              { element: "raw", data: "b" },
              { element: "raw", data: ">" },
              { element: "text", data: "@" },
              { element: "raw", data: "c" },
              { element: "raw", data: "@@" },
              { element: "raw", data: "d" },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
  });

  test("directive-looking email data is serialized as visible literal text", () => {
    const source = serialize({
      elements: [{ element: "email", data: "mail[[iframe https://evil.example]]" }],
    });

    expect(source).toBe("mail@@[[@@iframe https://evil.example]]");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "mail" },
              { element: "raw", data: "[[" },
              { element: "text", data: "iframe" },
              { element: "text", data: " " },
              { element: "text", data: "https" },
              { element: "text", data: ":" },
              { element: "text", data: "//" },
              { element: "text", data: "evil" },
              { element: "text", data: "." },
              { element: "text", data: "example" },
              { element: "text", data: "]]" },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
  });

  test("unsafe anchor attributes are omitted", () => {
    const tree: SyntaxTree = {
      elements: [
        {
          element: "anchor",
          data: {
            target: null,
            attributes: { title: `x"]] SENTINEL [[iframe evil ]] [[a title="y` },
            elements: [{ element: "text", data: "body" }],
          },
        },
      ],
    };

    const source = serialize(tree);

    expect(source).toBe("[[a]]body[[/a]]");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              {
                element: "anchor",
                data: {
                  target: null,
                  attributes: {},
                  elements: [{ element: "text", data: "body" }],
                },
              },
            ],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe footnote block titles are omitted", () => {
    const tree: SyntaxTree = {
      elements: [
        {
          element: "footnote-block",
          data: { title: `x"]] SENTINEL [[iframe evil ]] [[footnoteblock title="y`, hide: false },
        },
      ],
    };

    const source = serialize(tree);

    expect(source).toBe("[[footnoteblock]]\n");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe gallery item sources are omitted", () => {
    const tree: SyntaxTree = {
      elements: [
        {
          element: "gallery",
          data: {
            size: "thumbnail",
            order: "name",
            viewer: true,
            content: {
              type: "items",
              items: [
                {
                  source: "x\n[[/gallery]]\nSENTINEL [[iframe evil]]",
                  link: null,
                  alt: null,
                  newWindow: false,
                },
              ],
            },
          },
        },
      ],
    };

    const source = serialize(tree);

    expect(source).toBe("[[gallery]]\n");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "gallery",
          data: {
            size: "thumbnail",
            order: "name",
            viewer: true,
            content: { type: "auto", files: null },
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test.each([
    {
      name: "direct URL",
      data: {
        type: "direct" as const,
        link: "https://example.com/]]\nSENTINEL [[iframe evil]]",
        extra: null,
        label: { text: "safe label" },
        target: null,
      },
    },
    {
      name: "page target",
      data: {
        type: "page" as const,
        link: "page]]\nSENTINEL [[iframe evil]]",
        extra: null,
        label: "page" as const,
        target: null,
      },
    },
    {
      name: "anchor label",
      data: {
        type: "anchor" as const,
        link: "#",
        extra: null,
        label: { text: "label]\nSENTINEL [[iframe evil]]" },
        target: null,
      },
    },
  ])("unsafe link $name omits the entire link", ({ data }) => {
    const source = serialize({ elements: [{ element: "link", data }] });

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe anchor names are omitted", () => {
    const source = serialize({
      elements: [{ element: "anchor-name", data: "name]]\nSENTINEL [[iframe evil]]" }],
    });

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe color values omit the wrapper but preserve its content", () => {
    const source = serialize({
      elements: [
        {
          element: "color",
          data: {
            color: "red|body## SENTINEL [[iframe evil]]",
            elements: [{ element: "text", data: "safetext" }],
          },
        },
      ],
    });

    expect(source).toBe("safetext");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "safetext" }],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test("unsafe size values omit the wrapper but preserve its content", () => {
    const source = serialize({
      elements: [
        {
          element: "container",
          data: {
            type: "size",
            attributes: { style: "font-size: 1em]] SENTINEL [[iframe evil]]" },
            elements: [{ element: "text", data: "safetext" }],
          },
        },
      ],
    });

    expect(source).toBe("safetext");
    expect(parse(source).ast).toEqual({
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "safetext" }],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });

  test.each([
    {
      name: "inline math",
      tree: {
        elements: [
          {
            element: "math-inline",
            data: { "latex-source": "x $]] SENTINEL [[iframe evil]]" },
          },
        ],
      } satisfies SyntaxTree,
    },
    {
      name: "embed provider ID",
      tree: {
        elements: [
          {
            element: "embed",
            data: {
              embed: "youtube",
              data: { "video-id": "x]]\nSENTINEL [[iframe evil]]" },
            },
          },
        ],
      } satisfies SyntaxTree,
    },
    {
      name: "bibliography citation",
      tree: {
        elements: [
          {
            element: "bibliography-cite",
            data: { label: "x)) SENTINEL [[iframe evil]]", brackets: true },
          },
        ],
      } satisfies SyntaxTree,
    },
    {
      name: "equation reference",
      tree: {
        elements: [{ element: "equation-reference", data: "x]] SENTINEL [[iframe evil]]" }],
      } satisfies SyntaxTree,
    },
    ...["embed", "embedvideo", "embedaudio"].flatMap((closeName) =>
      [`[[/${closeName} x]]`, `[[/${closeName}!]]`].map((closeCandidate) => ({
        name: `${closeName} block close candidate ${closeCandidate}`,
        tree: {
          elements: [
            {
              element: "embed-block" as const,
              data: { contents: `safe ${closeCandidate}\nSENTINEL [[iframe evil]]` },
            },
          ],
        } satisfies SyntaxTree,
      })),
    ),
  ])("unsafe $name omits the entire directive", ({ tree }) => {
    const source = serialize(tree);

    expect(source).toBe("");
    expect(parse(source).ast).toEqual({
      elements: [{ element: "footnote-block", data: { title: null, hide: false } }],
    });
    expect(JSON.stringify(parse(source).ast)).not.toContain("SENTINEL");
  });
});

function renderTextContent(tree: SyntaxTree): string {
  return tree.elements
    .flatMap((element) =>
      element.element === "container" && element.data.type === "paragraph"
        ? element.data.elements
        : [],
    )
    .map((element) => (element.element === "text" || element.element === "raw" ? element.data : ""))
    .join("");
}
