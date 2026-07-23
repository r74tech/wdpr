import { describe, expect, it } from "bun:test";
import { renderToHtml, type RenderOptions } from "@wdprlib/render";
import type { SyntaxTree } from "@wdprlib/ast";

function pageLinkTree(page: string): SyntaxTree {
  return {
    elements: [
      {
        element: "link",
        data: {
          type: "page",
          link: { site: null, page },
          extra: null,
          label: "page",
          target: null,
        },
      },
    ],
  };
}

function crossSitePageLinkTree(site: string, page: string): SyntaxTree {
  const tree = pageLinkTree(page);
  const link = tree.elements[0];
  if (link?.element === "link" && typeof link.data.link === "object") {
    link.data.link.site = site;
  }
  return tree;
}

describe("renderLink - newpage class for category-prefixed pages", () => {
  it("does not add newpage class when pageExists returns true for category page", () => {
    const tree = pageLinkTree("main:start");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: (p) => p === "main:start",
      },
    };
    const html = renderToHtml(tree, options);
    expect(html).not.toContain("newpage");
    expect(html).toContain('href="/main:start"');
  });

  it("adds newpage class when pageExists returns false for category page", () => {
    const tree = pageLinkTree("unknown:foo");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: () => false,
      },
    };
    const html = renderToHtml(tree, options);
    expect(html).toContain('class="newpage"');
  });

  it("calls pageExists for share:<ULID> category links", () => {
    const calls: string[] = [];
    const tree = pageLinkTree("share:01j0sampe0share0page0000xx");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: (p) => {
          calls.push(p);
          return true;
        },
      },
    };
    const html = renderToHtml(tree, options);
    expect(calls).toEqual(["share:01j0sampe0share0page0000xx"]);
    expect(html).not.toContain("newpage");
  });

  it("adds newpage class for private:<ULID> when pageExists returns false", () => {
    const tree = pageLinkTree("private:00000000000000000000000000");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: () => false,
      },
    };
    const html = renderToHtml(tree, options);
    expect(html).toContain('class="newpage"');
  });

  it("skips pageExists for //protocol-relative paths", () => {
    let called = false;
    const tree = pageLinkTree("//external/path");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: () => {
          called = true;
          return false;
        },
      },
    };
    const html = renderToHtml(tree, options);
    expect(called).toBe(false);
    expect(html).not.toContain("newpage");
  });

  it("skips pageExists for #/hash-routing paths", () => {
    let called = false;
    const tree = pageLinkTree("main/#/something");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: () => {
          called = true;
          return false;
        },
      },
    };
    const html = renderToHtml(tree, options);
    expect(called).toBe(false);
    expect(html).not.toContain("newpage");
  });

  it("strips anchor before calling pageExists (category:name#anchor)", () => {
    const calls: string[] = [];
    const tree = pageLinkTree("share:01j0sampe0share0page0000xx#section");
    const options: RenderOptions = {
      page: {
        pageName: "current",
        pageExists: (p) => {
          calls.push(p);
          return true;
        },
      },
    };
    renderToHtml(tree, options);
    expect(calls).toEqual(["share:01j0sampe0share0page0000xx"]);
  });

  it("does not check or mark cross-site page links as new pages", () => {
    let called = false;
    const html = renderToHtml(crossSitePageLinkTree("other", "same-name"), {
      page: {
        pageName: "current",
        pageExists: () => {
          called = true;
          return false;
        },
      },
    });

    expect(called).toBe(false);
    expect(html).not.toContain("newpage");
  });
});
