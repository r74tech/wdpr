import { describe, expect, it } from "bun:test";
import { renderToHtml } from "@wdprlib/render";
import type { RenderOptions } from "@wdprlib/render";
import { sortGalleryFiles } from "../../../packages/render/src/elements/gallery/sort";
import type { GalleryData, GalleryItem, SyntaxTree } from "@wdprlib/ast";
import { createSettings } from "@wdprlib/ast";

/**
 * [[gallery]] render tests.
 *
 * Expected HTML is hand-written from the design contract (rationalized
 * class-compatible markup), not generated from the implementation.
 */

function render(data: GalleryData, options: RenderOptions = {}): string {
  const tree: SyntaxTree = { elements: [{ element: "gallery", data }] };
  return renderToHtml(tree, { page: { pageName: "test-page" }, ...options });
}

function gallery(partial: Partial<GalleryData>): GalleryData {
  return {
    size: "thumbnail",
    order: "name",
    viewer: true,
    content: { type: "auto", files: null },
    ...partial,
  };
}

function item(source: string, extra: Partial<GalleryItem> = {}): GalleryItem {
  return { source, link: null, alt: null, newWindow: false, ...extra };
}

describe("renderGallery: box", () => {
  it("renders an empty box for unresolved auto content", () => {
    expect(render(gallery({}))).toBe('<div class="gallery-box"></div>');
  });

  it("adds data-viewer=false only when the viewer is disabled", () => {
    expect(render(gallery({ viewer: false }))).toBe(
      '<div class="gallery-box" data-viewer="false"></div>',
    );
  });
});

describe("renderGallery: item URLs", () => {
  it("renders a current-page file with resized src and original href", () => {
    expect(render(gallery({ content: { type: "items", items: [item("a.jpg")] } }))).toBe(
      '<div class="gallery-box">' +
        '<figure class="gallery-item thumbnail">' +
        '<a href="/local--files/test-page/a.jpg" class="with-lb">' +
        '<img src="/local--resized-images/test-page/a.jpg/thumbnail.jpg" alt=""/>' +
        "</a></figure></div>",
    );
  });

  it("renders a page/file source against that page", () => {
    expect(
      render(gallery({ size: "small", content: { type: "items", items: [item("other/b.png")] } })),
    ).toContain(
      '<a href="/local--files/other/b.png" class="with-lb">' +
        '<img src="/local--resized-images/other/b.png/small.jpg" alt=""/>',
    );
  });

  it("strips one leading slash from a page/file source", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("/other/b.png")] } })),
    ).toContain('href="/local--files/other/b.png"');
  });

  it("keeps site:page/file sources as a page path", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("site:page/c.png")] } })),
    ).toContain('href="/local--files/site:page/c.png"');
  });

  it("uses the original file for size=original", () => {
    expect(
      render(gallery({ size: "original", content: { type: "items", items: [item("a.jpg")] } })),
    ).toContain(
      '<figure class="gallery-item original">' +
        '<a href="/local--files/test-page/a.jpg" class="with-lb">' +
        '<img src="/local--files/test-page/a.jpg" alt=""/>',
    );
  });

  it("renders an external URL source as-is with the gallery size class", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("http://example.com/x.png")] } })),
    ).toBe(
      '<div class="gallery-box">' +
        '<figure class="gallery-item thumbnail">' +
        '<a href="http://example.com/x.png" class="with-lb">' +
        '<img src="http://example.com/x.png" alt=""/>' +
        "</a></figure></div>",
    );
  });

  it("resolves a bare filename without page context like image file1", () => {
    const tree: SyntaxTree = {
      elements: [
        {
          element: "gallery",
          data: gallery({ content: { type: "items", items: [item("a.jpg")] } }),
        },
      ],
    };
    expect(renderToHtml(tree)).toContain(
      '<a href="/local--files/a.jpg" class="with-lb">' +
        '<img src="/local--resized-images/a.jpg/thumbnail.jpg" alt=""/>',
    );
  });
});

describe("renderGallery: links and new windows", () => {
  it("respects an explicit wiki-page link and drops the lightbox marker", () => {
    expect(
      render(
        gallery({ content: { type: "items", items: [item("a.jpg", { link: "some-page" })] } }),
      ),
    ).toContain('<a href="/some-page"><img');
  });

  it("respects an explicit URL link, even for external sources", () => {
    expect(
      render(
        gallery({
          content: {
            type: "items",
            items: [item("http://example.com/x.png", { link: "http://example.org/" })],
          },
        }),
      ),
    ).toContain('<a href="http://example.org/"><img');
  });

  it("keeps root-relative and fragment links unchanged", () => {
    expect(
      render(
        gallery({ content: { type: "items", items: [item("a.jpg", { link: "/some-page" })] } }),
      ),
    ).toContain('<a href="/some-page"><img');
    expect(
      render(gallery({ content: { type: "items", items: [item("a.jpg", { link: "#section" })] } })),
    ).toContain('<a href="#section"><img');
  });

  it("opens in a new window without a lightbox marker", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("a.jpg", { newWindow: true })] } })),
    ).toContain('<a href="/local--files/test-page/a.jpg" target="_blank" rel="noopener"><img');
  });

  it("combines an explicit link with a new window", () => {
    expect(
      render(
        gallery({
          content: {
            type: "items",
            items: [item("a.jpg", { link: "some-page", newWindow: true })],
          },
        }),
      ),
    ).toContain('<a href="/some-page" target="_blank" rel="noopener"><img');
  });
});

describe("renderGallery: alt and escaping", () => {
  it("renders the alt attribute", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("a.jpg", { alt: "An image" })] } })),
    ).toContain('alt="An image"');
  });

  it("escapes quotes and ampersands in URLs and alt text", () => {
    const html = render(
      gallery({
        content: {
          type: "items",
          items: [item('http://example.com/?a=1&b="x"', { alt: 'say "hi" & bye' })],
        },
      }),
    );
    expect(html).toContain("a=1&amp;b=&quot;x&quot;");
    expect(html).toContain('alt="say &quot;hi&quot; &amp; bye"');
  });
});

describe("renderGallery: skips and safety", () => {
  it("renders flickr: sources like any other current-page filename", () => {
    expect(render(gallery({ content: { type: "items", items: [item("flickr:123")] } }))).toBe(
      '<div class="gallery-box">' +
        '<figure class="gallery-item thumbnail">' +
        '<a href="/local--files/test-page/flickr:123" class="with-lb">' +
        '<img src="/local--resized-images/test-page/flickr:123/thumbnail.jpg" alt=""/>' +
        "</a></figure></div>",
    );
  });

  it("skips items with a dangerous external source", () => {
    expect(
      render(gallery({ content: { type: "items", items: [item("javascript://alert(1)")] } })),
    ).toBe('<div class="gallery-box"></div>');
  });

  it("ignores a dangerous link but keeps the item with its image href", () => {
    expect(
      render(
        gallery({
          content: { type: "items", items: [item("a.jpg", { link: "javascript://alert(1)" })] },
        }),
      ),
    ).toContain('<a href="/local--files/test-page/a.jpg" class="with-lb"><img');
  });

  it("keeps newWindow when a dangerous link is dropped", () => {
    expect(
      render(
        gallery({
          content: {
            type: "items",
            items: [item("a.jpg", { link: "javascript://alert(1)", newWindow: true })],
          },
        }),
      ),
    ).toContain('<a href="/local--files/test-page/a.jpg" target="_blank" rel="noopener"><img');
  });

  it("skips local items when local paths are disabled", () => {
    const html = render(
      gallery({
        content: {
          type: "items",
          items: [item("a.jpg"), item("http://example.com/x.png")],
        },
      }),
      { settings: createSettings("forum-post") },
    );
    expect(html).toBe(
      '<div class="gallery-box">' +
        '<figure class="gallery-item thumbnail">' +
        '<a href="http://example.com/x.png" class="with-lb">' +
        '<img src="http://example.com/x.png" alt=""/>' +
        "</a></figure></div>",
    );
  });
});

describe("renderGallery: auto content from page files", () => {
  it("renders pre-filled files like link-less items", () => {
    expect(render(gallery({ content: { type: "auto", files: ["a.jpg", "b.jpg"] } }))).toBe(
      '<div class="gallery-box">' +
        '<figure class="gallery-item thumbnail">' +
        '<a href="/local--files/test-page/a.jpg" class="with-lb">' +
        '<img src="/local--resized-images/test-page/a.jpg/thumbnail.jpg" alt=""/>' +
        "</a></figure>" +
        '<figure class="gallery-item thumbnail">' +
        '<a href="/local--files/test-page/b.jpg" class="with-lb">' +
        '<img src="/local--resized-images/test-page/b.jpg/thumbnail.jpg" alt=""/>' +
        "</a></figure></div>",
    );
  });

  it("renders page context files sorted by the gallery's order", () => {
    const files = [
      { name: "zeta.png", createdAt: 100 },
      { name: "alpha.png", createdAt: 200 },
    ];
    const html = render(gallery({ order: "created_at desc" }), {
      page: { pageName: "test-page", files },
    });
    const alphaAt = html.indexOf("alpha.png");
    const zetaAt = html.indexOf("zeta.png");
    expect(alphaAt).toBeGreaterThanOrEqual(0);
    expect(zetaAt).toBeGreaterThan(alphaAt);
  });

  it("lets each gallery sort the same page files by its own order", () => {
    const files = [
      { name: "b.png", createdAt: 2 },
      { name: "a.png", createdAt: 1 },
    ];
    const tree: SyntaxTree = {
      elements: [
        { element: "gallery", data: gallery({ order: "name" }) },
        { element: "gallery", data: gallery({ order: "created_at desc" }) },
      ],
    };
    const html = renderToHtml(tree, { page: { pageName: "p", files } });
    const boxes = html.split('<div class="gallery-box">').slice(1);
    expect(boxes[0]!.indexOf("a.png")).toBeLessThan(boxes[0]!.indexOf("b.png"));
    expect(boxes[1]!.indexOf("b.png")).toBeLessThan(boxes[1]!.indexOf("a.png"));
  });

  it("renders the Wikidot error block when the page has no image attachments", () => {
    expect(render(gallery({}), { page: { pageName: "test-page", files: [] } })).toBe(
      '<div class="error-block">Sorry, we couldn\'t find any images attached to this page.</div>',
    );
  });

  it("renders an empty gallery box when the attachment list is unknown", () => {
    expect(render(gallery({}))).toBe('<div class="gallery-box"></div>');
  });
});

describe("sortGalleryFiles", () => {
  const files = [
    { name: "zeta.png", createdAt: 100 },
    { name: "Beta.png", createdAt: 300 },
    { name: "alpha.png", createdAt: 200 },
  ];

  it("sorts by name using code points, desc flips", () => {
    expect(sortGalleryFiles(files, "name").map((f) => f.name)).toEqual([
      "Beta.png",
      "alpha.png",
      "zeta.png",
    ]);
    expect(sortGalleryFiles(files, "name desc").map((f) => f.name)).toEqual([
      "zeta.png",
      "alpha.png",
      "Beta.png",
    ]);
  });

  it("sorts by created_at, desc flips", () => {
    expect(sortGalleryFiles(files, "created_at").map((f) => f.name)).toEqual([
      "zeta.png",
      "alpha.png",
      "Beta.png",
    ]);
    expect(sortGalleryFiles(files, "created_at desc").map((f) => f.name)).toEqual([
      "Beta.png",
      "alpha.png",
      "zeta.png",
    ]);
  });

  it("keeps files without createdAt last in given order, also under desc", () => {
    const mixed = [
      { name: "no-date-1.png" },
      { name: "b.png", createdAt: 2 },
      { name: "no-date-2.png" },
      { name: "a.png", createdAt: 1 },
    ];
    expect(sortGalleryFiles(mixed, "created_at").map((f) => f.name)).toEqual([
      "a.png",
      "b.png",
      "no-date-1.png",
      "no-date-2.png",
    ]);
    expect(sortGalleryFiles(mixed, "created_at desc").map((f) => f.name)).toEqual([
      "b.png",
      "a.png",
      "no-date-1.png",
      "no-date-2.png",
    ]);
  });

  it("tie-breaks equal timestamps by name ascending, also under desc", () => {
    const tied = [
      { name: "b.png", createdAt: 1 },
      { name: "a.png", createdAt: 1 },
    ];
    expect(sortGalleryFiles(tied, "created_at").map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(sortGalleryFiles(tied, "created_at desc").map((f) => f.name)).toEqual([
      "a.png",
      "b.png",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...files];
    sortGalleryFiles(input, "name");
    expect(input.map((f) => f.name)).toEqual(["zeta.png", "Beta.png", "alpha.png"]);
  });
});
