import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import type { Element, GalleryData } from "@wdprlib/ast";

/**
 * [[gallery]] parser tests.
 *
 * Expected values are hand-written from the Wikidot reference behavior
 * (accepted syntax verified against wikidot.com docs and live output) and
 * wdpr's rationalized design decisions, not from wdpr's own output.
 */

function firstElement(input: string): Element {
  const element = parse(input).ast.elements[0];
  if (!element) throw new Error("no elements parsed");
  return element;
}

function galleryData(input: string): GalleryData {
  const element = firstElement(input);
  if (element.element !== "gallery") {
    throw new Error(`Expected gallery, got ${JSON.stringify(element)}`);
  }
  return element.data;
}

const AUTO = { type: "auto", files: null } as const;
const DEFAULTS = { size: "thumbnail", order: "name", viewer: true } as const;

describe("gallery: standalone form", () => {
  it("parses [[gallery]] with defaults and unresolved auto content", () => {
    expect(galleryData("[[gallery]]")).toEqual({ ...DEFAULTS, content: AUTO });
  });

  it("accepts each valid size keyword", () => {
    for (const size of ["small", "medium", "thumbnail", "square", "original"]) {
      expect(galleryData(`[[gallery size="${size}"]]`)).toEqual({
        ...DEFAULTS,
        size,
        content: AUTO,
      } as never);
    }
  });

  it("falls back to thumbnail for an invalid or case-mismatched size", () => {
    expect(galleryData('[[gallery size="huge"]]').size).toBe("thumbnail");
    expect(galleryData('[[gallery size="Small"]]').size).toBe("thumbnail");
  });

  it("disables the viewer for viewer=no and viewer=false only", () => {
    expect(galleryData('[[gallery viewer="no"]]').viewer).toBe(false);
    expect(galleryData('[[gallery viewer="false"]]').viewer).toBe(false);
    expect(galleryData('[[gallery viewer="yes"]]').viewer).toBe(true);
    expect(galleryData('[[gallery viewer="true"]]').viewer).toBe(true);
    expect(galleryData('[[gallery viewer="banana"]]').viewer).toBe(true);
    expect(galleryData("[[gallery]]").viewer).toBe(true);
  });

  it("normalizes the order attribute including deprecated aliases", () => {
    expect(galleryData('[[gallery order="name"]]').order).toBe("name");
    expect(galleryData('[[gallery order="name desc"]]').order).toBe("name desc");
    expect(galleryData('[[gallery order="created_at"]]').order).toBe("created_at");
    expect(galleryData('[[gallery order="created_at desc"]]').order).toBe("created_at desc");
    expect(galleryData('[[gallery order="nameDesc"]]').order).toBe("name desc");
    expect(galleryData('[[gallery order="dateAdded"]]').order).toBe("created_at");
    expect(galleryData('[[gallery order="dateAddedDesc"]]').order).toBe("created_at desc");
    expect(galleryData('[[gallery order="name desc desc"]]').order).toBe("name");
    expect(galleryData('[[gallery order="created_at desc desc"]]').order).toBe("created_at");
    expect(galleryData('[[gallery order="rating"]]').order).toBe("name");
  });

  it("ignores unknown attributes", () => {
    expect(galleryData('[[gallery foo="bar"]]')).toEqual({ ...DEFAULTS, content: AUTO });
  });

  it("parses an uppercase block name", () => {
    expect(galleryData('[[GALLERY size="small"]]').size).toBe("small");
  });
});

describe("gallery: content form", () => {
  function items(input: string) {
    const data = galleryData(input);
    if (data.content.type !== "items") {
      throw new Error(`Expected items content, got ${JSON.stringify(data.content)}`);
    }
    return data.content.items;
  }

  it("parses a single local source", () => {
    expect(items("[[gallery]]\n: image.jpg\n[[/gallery]]")).toEqual([
      { source: "image.jpg", link: null, alt: null, newWindow: false },
    ]);
  });

  it("parses multiple lines with page/file and URL sources", () => {
    expect(
      items(
        '[[gallery size="medium"]]\n: first.png\n: other-page/second.png\n: http://example.com/third.png\n[[/gallery]]',
      ),
    ).toEqual([
      { source: "first.png", link: null, alt: null, newWindow: false },
      { source: "other-page/second.png", link: null, alt: null, newWindow: false },
      { source: "http://example.com/third.png", link: null, alt: null, newWindow: false },
    ]);
  });

  it("keeps leading-slash and site:page/file sources verbatim", () => {
    expect(items("[[gallery]]\n: /page/file.jpg\n[[/gallery]]")[0]?.source).toBe("/page/file.jpg");
    expect(items("[[gallery]]\n: site:page/file.jpg\n[[/gallery]]")[0]?.source).toBe(
      "site:page/file.jpg",
    );
  });

  it("extracts link and alt attributes and drops everything else", () => {
    expect(
      items('[[gallery]]\n: a.jpg link="some-page" alt="An image" class="ignored"\n[[/gallery]]'),
    ).toEqual([{ source: "a.jpg", link: "some-page", alt: "An image", newWindow: false }]);
  });

  it("does not lowercase item attribute keys (LINK= is not link=)", () => {
    expect(items('[[gallery]]\n: a.jpg LINK="some-page"\n[[/gallery]]')).toEqual([
      { source: "a.jpg", link: null, alt: null, newWindow: false },
    ]);
  });

  it("sets newWindow from a * prefix on the source", () => {
    expect(items("[[gallery]]\n: *a.jpg\n[[/gallery]]")).toEqual([
      { source: "a.jpg", link: null, alt: null, newWindow: true },
    ]);
  });

  it("sets newWindow from a * prefix on the link for any source kind", () => {
    expect(items('[[gallery]]\n: a.jpg link="*some-page"\n[[/gallery]]')).toEqual([
      { source: "a.jpg", link: "some-page", alt: null, newWindow: true },
    ]);
    expect(
      items('[[gallery]]\n: http://example.com/a.jpg link="*http://example.org/"\n[[/gallery]]'),
    ).toEqual([
      {
        source: "http://example.com/a.jpg",
        link: "http://example.org/",
        alt: null,
        newWindow: true,
      },
    ]);
  });

  it("unescapes backslash escapes in attribute values", () => {
    expect(items('[[gallery]]\n: a.jpg link="pa\\"ge\\\\x"\n[[/gallery]]')).toEqual([
      { source: "a.jpg", link: 'pa"ge\\x', alt: null, newWindow: false },
    ]);
  });

  it("keeps an empty link attribute as an empty string", () => {
    expect(items('[[gallery]]\n: a.jpg link=""\n[[/gallery]]')[0]?.link).toBe("");
  });

  it("splits source and attributes at the first space only", () => {
    expect(items('[[gallery]]\n: a.jpg  link="x"  extra\n[[/gallery]]')).toEqual([
      { source: "a.jpg", link: "x", alt: null, newWindow: false },
    ]);
  });
});

describe("gallery: flickr sources", () => {
  it("treats flickr: sources like any other source with no diagnostics", () => {
    const result = parse("[[gallery]]\n: ok.jpg\n: flickr:12345_abc\n[[/gallery]]");
    const data = result.ast.elements[0];
    if (data?.element !== "gallery" || data.data.content.type !== "items") {
      throw new Error("expected gallery items");
    }
    expect(data.data.content.items).toEqual([
      { source: "ok.jpg", link: null, alt: null, newWindow: false },
      { source: "flickr:12345_abc", link: null, alt: null, newWindow: false },
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});

describe("gallery: fallback to standalone form", () => {
  function firstGallery(input: string): GalleryData {
    return galleryData(input);
  }

  it.each([
    ["blank line before the first : line", "[[gallery]]\n\n: a.jpg\n[[/gallery]]"],
    ["missing close tag", "[[gallery]]\n: a.jpg"],
    ["blank line before the close tag", "[[gallery]]\n: a.jpg\n\n[[/gallery]]"],
    ["non-colon line among the items", "[[gallery]]\n: a.jpg\nplain text\n[[/gallery]]"],
    ["colon without a following space", "[[gallery]]\n:a.jpg\n[[/gallery]]"],
    ["trailing whitespace after ]]", "[[gallery]] \n: a.jpg\n[[/gallery]]"],
  ])("%s breaks the content form", (_name, input) => {
    expect(firstGallery(input)).toEqual({ ...DEFAULTS, content: AUTO });
  });
});
