import { describe, expect, it } from "bun:test";
import { serialize } from "@wdprlib/decompiler";
import { parse } from "@wdprlib/parser";
import type { Element } from "@wdprlib/ast";

/**
 * Gallery serializer tests: text expectations plus parse → serialize →
 * parse AST equivalence (the roundtrip contract).
 */

function firstGallery(source: string): Element {
  const element = parse(source).ast.elements[0];
  if (element?.element !== "gallery") {
    throw new Error(`Expected gallery, got ${JSON.stringify(element)}`);
  }
  return element;
}

function roundtrip(source: string): { text: string; reparsed: Element } {
  const tree = parse(source).ast;
  const text = serialize(tree);
  return { text, reparsed: firstGallery(text) };
}

describe("serializeGallery", () => {
  it("serializes the auto form as a bare tag, omitting default attributes", () => {
    const { text, reparsed } = roundtrip("[[gallery]]");
    expect(text.trim()).toBe("[[gallery]]");
    expect(reparsed).toEqual(firstGallery("[[gallery]]"));
  });

  it("emits non-default attributes", () => {
    const source = '[[gallery size="medium" order="created_at desc" viewer="no"]]';
    const { text, reparsed } = roundtrip(source);
    expect(text.trim()).toBe('[[gallery size="medium" order="created_at desc" viewer="no"]]');
    expect(reparsed).toEqual(firstGallery(source));
  });

  it("round-trips item lines with link, alt and the * prefix", () => {
    const source =
      '[[gallery]]\n: a.jpg\n: *b.jpg link="some-page" alt="An image"\n: http://example.com/c.png\n[[/gallery]]';
    const { text, reparsed } = roundtrip(source);
    expect(text.trim()).toBe(source);
    expect(reparsed).toEqual(firstGallery(source));
  });

  it("normalizes a link-side * onto the source when serializing", () => {
    const source = '[[gallery]]\n: a.jpg link="*some-page"\n[[/gallery]]';
    const { text, reparsed } = roundtrip(source);
    expect(text.trim()).toBe('[[gallery]]\n: *a.jpg link="some-page"\n[[/gallery]]');
    expect(reparsed).toEqual(firstGallery(source));
  });

  it("re-escapes quotes and backslashes in attribute values", () => {
    const source = '[[gallery]]\n: a.jpg link="pa\\"ge\\\\x" alt="say \\"hi\\""\n[[/gallery]]';
    const { text, reparsed } = roundtrip(source);
    expect(text.trim()).toBe(source);
    expect(reparsed).toEqual(firstGallery(source));
  });

  it("keeps an empty link attribute", () => {
    const source = '[[gallery]]\n: a.jpg link=""\n[[/gallery]]';
    const { reparsed } = roundtrip(source);
    expect(reparsed).toEqual(firstGallery(source));
  });
});
