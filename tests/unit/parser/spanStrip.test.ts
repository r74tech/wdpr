import { describe, expect, it } from "bun:test";
import {
  mergeSpanStripParagraphs,
  cleanInternalFlags,
} from "../../../packages/parser/src/parser/postprocess/spanStrip";
import type { Element } from "@wdprlib/ast";

/**
 * spanStrip Post-processing Tests
 *
 * Tests for paragraph merging with span_ (paragraph strip) mode
 * and internal flag cleanup.
 */

// Helper to create paragraph element
function paragraph(...elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements,
    },
  };
}

// Helper to create text element
function text(content: string): Element {
  return { element: "text", data: content };
}

// Helper to create span element
function span(elements: Element[], attributes: Record<string, string> = {}): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes,
      elements,
    },
  };
}

// Helper to create span_ (paragraph strip) marker
function spanStrip(elements: Element[], attributes: Record<string, string> = {}): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes,
      elements,
      _paragraphStrip: true,
    },
  };
}

// Helper to create empty span_ marker
function emptySpanStrip(): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes: {},
      elements: [],
      _emptyParagraphStrip: true,
    },
  };
}

// Helper to create escaped span (content after blank line in span_)
function escapedSpan(elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes: {},
      elements,
      _escapedFromParagraph: true,
    },
  };
}

// Helper to create span split by blank line
function splitSpan(elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes: {},
      elements,
      _splitByBlankLine: true,
    },
  };
}

// Helper to create line-break element
function lineBreak(): Element {
  return { element: "line-break" };
}

describe("spanStrip postprocessing", () => {
  describe("mergeSpanStripParagraphs", () => {
    describe("basic paragraph merging", () => {
      it("paragraphs without span_ are not merged", () => {
        const input = [paragraph(text("First")), paragraph(text("Second"))];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          data: { elements: [{ data: "First" }] },
        });
        expect(result[1]).toMatchObject({
          data: { elements: [{ data: "Second" }] },
        });
      });

      it("paragraph with span_ is unwrapped (children become top-level)", () => {
        const input = [paragraph(spanStrip([text("First")])), paragraph(text("Second"))];

        const result = mergeSpanStripParagraphs(input);

        // span_ removes paragraph boundaries: children are unwrapped to top level
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          element: "container",
          data: { type: "span" },
        });
        expect(result[1]).toMatchObject({
          element: "text",
          data: "Second",
        });
      });

      it("multiple span_ paragraphs all get unwrapped", () => {
        const input = [
          paragraph(spanStrip([text("First")])),
          paragraph(text("Second")),
          paragraph(spanStrip([text("Third")])),
          paragraph(text("Fourth")),
        ];

        const result = mergeSpanStripParagraphs(input);

        // All paragraph wrappers are removed, children become top-level
        expect(result).toHaveLength(4);
        expect(result[0]).toMatchObject({ element: "container", data: { type: "span" } });
        expect(result[1]).toMatchObject({ element: "text", data: "Second" });
        expect(result[2]).toMatchObject({ element: "container", data: { type: "span" } });
        expect(result[3]).toMatchObject({ element: "text", data: "Fourth" });
      });
    });

    describe("non-paragraph elements", () => {
      it("non-paragraph elements stop merging", () => {
        const hr: Element = { element: "horizontal-rule" };
        const input = [paragraph(spanStrip([text("First")])), hr, paragraph(text("Second"))];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toHaveLength(3);
        expect(result[1]).toEqual(hr);
      });

      it("non-paragraph elements pass through unchanged", () => {
        const heading: Element = {
          element: "container",
          data: {
            type: { header: { level: 1, "has-toc": true } },
            attributes: {},
            elements: [text("Title")],
          },
        };
        const input = [heading];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toEqual([heading]);
      });
    });

    describe("line-break removal around span_", () => {
      it("line-break after span_ marker is removed", () => {
        const input = [paragraph(spanStrip([text("Text")]), lineBreak(), text("More"))];

        const result = mergeSpanStripParagraphs(input);

        const merged = result[0]?.data as { elements: Element[] };
        const hasLineBreak = merged.elements.some((el) => el.element === "line-break");
        expect(hasLineBreak).toBe(false);
      });

      it("line-break before span_ marker is removed", () => {
        const input = [paragraph(text("Text"), lineBreak(), spanStrip([text("More")]))];

        const result = mergeSpanStripParagraphs(input);

        // span_ causes paragraph unwrap, line-break is removed
        const hasLineBreak = result.some((el) => el.element === "line-break");
        expect(hasLineBreak).toBe(false);
      });

      it("line-break not adjacent to span_ is preserved", () => {
        const input = [paragraph(text("Line1"), lineBreak(), text("Line2"))];

        const result = mergeSpanStripParagraphs(input);

        const merged = result[0]?.data as { elements: Element[] };
        const hasLineBreak = merged.elements.some((el) => el.element === "line-break");
        expect(hasLineBreak).toBe(true);
      });
    });

    describe("empty span_ markers", () => {
      it("empty span_ marker is removed from output", () => {
        const input = [paragraph(text("Before"), emptySpanStrip(), text("After"))];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toEqual([paragraph(text("Before"), text("After"))]);
      });
    });

    describe("escaped spans (content after blank line)", () => {
      it("escaped span is extracted outside paragraph", () => {
        const input = [paragraph(spanStrip([text("Inside")]), escapedSpan([text("Outside")]))];

        const result = mergeSpanStripParagraphs(input);

        // First is paragraph, second is extracted span
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          element: "container",
          data: { type: "paragraph" },
        });
        expect(result[1]).toMatchObject({
          element: "container",
          data: { type: "span" },
        });
      });

      it("multiple escaped spans are all extracted", () => {
        const input = [
          paragraph(
            spanStrip([text("Inside")]),
            escapedSpan([text("Out1")]),
            escapedSpan([text("Out2")]),
          ),
        ];

        const result = mergeSpanStripParagraphs(input);

        // Paragraph + 2 escaped spans
        expect(result).toHaveLength(3);
      });

      it("content after escaped span is also extracted", () => {
        const input = [
          paragraph(spanStrip([text("Inside")]), escapedSpan([text("Escaped")]), text("After")),
        ];

        const result = mergeSpanStripParagraphs(input);

        // Paragraph + escaped span + span containing "After"
        expect(result.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("split by blank line", () => {
      it("span with _splitByBlankLine starts new paragraph", () => {
        const input = [paragraph(text("Before"), splitSpan([text("After")]))];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toHaveLength(2);
      });

      it("multiple split spans create multiple paragraphs", () => {
        const input = [
          paragraph(text("First"), splitSpan([text("Second")]), splitSpan([text("Third")])),
        ];

        const result = mergeSpanStripParagraphs(input);

        expect(result).toHaveLength(3);
      });
    });
  });

  describe("cleanInternalFlags", () => {
    it("removes _paragraphStrip flag from span", () => {
      const input = [spanStrip([text("Content")])];

      const result = cleanInternalFlags(input);

      const cleaned = result[0]?.data as { _paragraphStrip?: boolean };
      expect(cleaned._paragraphStrip).toBeUndefined();
    });

    it("removes _emptyParagraphStrip flag from span", () => {
      const input = [emptySpanStrip()];

      // Empty spans are removed entirely
      const result = cleanInternalFlags(input);

      expect(result).toHaveLength(0);
    });

    it("removes _escapedFromParagraph flag from span", () => {
      const input = [escapedSpan([text("Content")])];

      const result = cleanInternalFlags(input);

      const cleaned = result[0]?.data as { _escapedFromParagraph?: boolean };
      expect(cleaned._escapedFromParagraph).toBeUndefined();
    });

    it("removes _splitByBlankLine flag from span", () => {
      const input = [splitSpan([text("Content")])];

      const result = cleanInternalFlags(input);

      const cleaned = result[0]?.data as { _splitByBlankLine?: boolean };
      expect(cleaned._splitByBlankLine).toBeUndefined();
    });

    it("recursively cleans nested containers", () => {
      const nested = paragraph(spanStrip([span([text("Deep")])]));
      const input = [nested];

      const result = cleanInternalFlags(input);

      // Check nested span is cleaned
      const para = result[0]?.data as { elements: Element[] };
      const innerSpan = para.elements[0]?.data as { _paragraphStrip?: boolean };
      expect(innerSpan._paragraphStrip).toBeUndefined();
    });

    it("removes empty spans", () => {
      const input = [span([]), text("Keep")];

      const result = cleanInternalFlags(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ element: "text", data: "Keep" });
    });

    it("removes whitespace adjacent to empty spans", () => {
      const whitespace: Element = { element: "text", data: "   " };
      const input = [whitespace, span([]), text("Keep")];

      const result = cleanInternalFlags(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ element: "text", data: "Keep" });
    });

    it("cleans collapsible elements", () => {
      const collapsible: Element = {
        element: "collapsible",
        data: {
          show: "show",
          hide: "hide",
          hideLocation: "bottom",
          folded: true,
          elements: [spanStrip([text("Content")])],
        },
      };
      const input = [collapsible];

      const result = cleanInternalFlags(input);

      const cleaned = result[0]?.data as { elements: Element[] };
      const innerSpan = cleaned.elements[0]?.data as { _paragraphStrip?: boolean };
      expect(innerSpan._paragraphStrip).toBeUndefined();
    });

    it("cleans color elements", () => {
      const color: Element = {
        element: "color",
        data: {
          color: "red",
          elements: [spanStrip([text("Content")])],
        },
      };
      const input = [color];

      const result = cleanInternalFlags(input);

      const cleaned = result[0]?.data as { elements: Element[] };
      const innerSpan = cleaned.elements[0]?.data as { _paragraphStrip?: boolean };
      expect(innerSpan._paragraphStrip).toBeUndefined();
    });

    it("preserves non-container elements unchanged", () => {
      const hr: Element = { element: "horizontal-rule" };
      const input = [hr];

      const result = cleanInternalFlags(input);

      expect(result).toEqual([hr]);
    });
  });
});
