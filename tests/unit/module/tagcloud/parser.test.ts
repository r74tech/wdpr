import { describe, it, expect } from "bun:test";
import type { Element, Module } from "@wdprlib/ast";
import { tagCloudModuleRule } from "../../../../packages/parser/src/parser/rules/block/module/tagcloud/parser";
import type { ParseContext } from "../../../../packages/parser/src/parser/rules/types";

type TagCloudModuleData = Extract<Module, { module: "tag-cloud" }>;

function parseTagCloud(args: Record<string, string>): Module | Element {
  return tagCloudModuleRule.parse({} as ParseContext, 0, args);
}

function expectModule(result: Module | Element): TagCloudModuleData {
  if ("module" in result && result.module === "tag-cloud") return result;
  throw new Error(`Expected tag-cloud module, got ${JSON.stringify(result)}`);
}

function expectErrorBlock(result: Module | Element): string {
  if (
    "element" in result &&
    result.element === "container" &&
    result.data.attributes.class === "error-block"
  ) {
    const first = result.data.elements[0];
    if (first?.element === "text") return first.data;
  }
  throw new Error(`Expected error-block, got ${JSON.stringify(result)}`);
}

describe("tagCloudModuleRule", () => {
  it("applies all defaults when no attributes are given", () => {
    const data = expectModule(parseTagCloud({}));
    expect(data).toEqual({
      module: "tag-cloud",
      "min-font-size": 100,
      "max-font-size": 300,
      "font-size-unit": "%",
      "min-color": [128, 128, 192],
      "max-color": [64, 64, 128],
      target: "/system:page-tags/tag/",
      limit: 50,
      category: null,
    });
  });

  describe("font sizes", () => {
    it("parses both font sizes when given together", () => {
      const data = expectModule(parseTagCloud({ maxfontsize: "200px", minfontsize: "8px" }));
      expect(data["max-font-size"]).toBe(200);
      expect(data["min-font-size"]).toBe(8);
      expect(data["font-size-unit"]).toBe("px");
    });

    it("ignores maxFontSize when minFontSize is missing", () => {
      const data = expectModule(parseTagCloud({ maxfontsize: "200%" }));
      expect(data["max-font-size"]).toBe(300);
      expect(data["min-font-size"]).toBe(100);
    });

    it("treats empty minFontSize as missing (PHP truthiness)", () => {
      const data = expectModule(parseTagCloud({ maxfontsize: "200%", minfontsize: "" }));
      expect(data["max-font-size"]).toBe(300);
    });

    it.each(["pt", "rem", "vh", "cqw", "q", "svmin", "lvmax", "dvmin"])(
      "accepts modern CSS unit %s",
      (unit) => {
        const data = expectModule(
          parseTagCloud({ maxfontsize: `24${unit}`, minfontsize: `8${unit}` }),
        );
        expect(data["max-font-size"]).toBe(24);
        expect(data["font-size-unit"]).toBe(unit);
      },
    );

    it("matches units case-insensitively and normalizes to lowercase", () => {
      const data = expectModule(parseTagCloud({ maxfontsize: "24PT", minfontsize: "8pt" }));
      expect(data["font-size-unit"]).toBe("pt");
    });

    it("rejects an invalid maxFontSize format", () => {
      const message = expectErrorBlock(
        parseTagCloud({ maxfontsize: "12banana", minfontsize: "100%" }),
      );
      expect(message).toBe(
        "Unsupported format for font size. Use a number followed by a CSS length unit such as px, em or %.",
      );
    });

    it("rejects mismatched units", () => {
      const message = expectErrorBlock(parseTagCloud({ maxfontsize: "200%", minfontsize: "10px" }));
      expect(message).toBe("Format for minFontSize and maxFontSize must use the same unit.");
    });

    it("rejects an invalid minFontSize as a unit mismatch (PHP behavior)", () => {
      const message = expectErrorBlock(parseTagCloud({ maxfontsize: "200%", minfontsize: "bad" }));
      expect(message).toBe("Format for minFontSize and maxFontSize must use the same unit.");
    });
  });

  describe("colors", () => {
    it("parses both colors when given together", () => {
      const data = expectModule(parseTagCloud({ maxcolor: "0,0,0", mincolor: "200,200,200" }));
      expect(data["max-color"]).toEqual([0, 0, 0]);
      expect(data["min-color"]).toEqual([200, 200, 200]);
    });

    it("ignores maxColor when minColor is missing", () => {
      const data = expectModule(parseTagCloud({ maxcolor: "0,0,0" }));
      expect(data["max-color"]).toEqual([64, 64, 128]);
    });

    it("treats empty minColor as missing (PHP truthiness)", () => {
      const data = expectModule(parseTagCloud({ maxcolor: "0,0,0", mincolor: "" }));
      expect(data["max-color"]).toEqual([64, 64, 128]);
    });

    it("rejects an invalid color format", () => {
      const message = expectErrorBlock(parseTagCloud({ maxcolor: "red", mincolor: "0,0,0" }));
      expect(message).toBe(
        'Unsupported color format. Use "RRR,GGG,BBB" for Red,Green,Blue each within 0-255 range.',
      );
    });
  });

  describe("target", () => {
    it("defaults to the system page-tags path", () => {
      expect(expectModule(parseTagCloud({})).target).toBe("/system:page-tags/tag/");
    });

    it("treats an empty target as missing (PHP truthiness)", () => {
      expect(expectModule(parseTagCloud({ target: "" })).target).toBe("/system:page-tags/tag/");
    });

    it("normalizes a bare page name", () => {
      expect(expectModule(parseTagCloud({ target: "tags" })).target).toBe("/tags/tag/");
    });

    it("keeps existing leading and trailing slashes", () => {
      expect(expectModule(parseTagCloud({ target: "/tags/" })).target).toBe("/tags/tag/");
    });
  });

  describe("limit", () => {
    it("accepts a positive integer", () => {
      expect(expectModule(parseTagCloud({ limit: "10" })).limit).toBe(10);
    });

    it.each(["0", "-5", "", "10foo", "1.5", "9".repeat(400)])(
      "falls back to 50 for %j",
      (value) => {
        expect(expectModule(parseTagCloud({ limit: value })).limit).toBe(50);
      },
    );
  });

  describe("category", () => {
    it("defaults to null", () => {
      expect(expectModule(parseTagCloud({})).category).toBeNull();
    });

    it("treats an empty category as all categories (PHP truthiness)", () => {
      expect(expectModule(parseTagCloud({ category: "" })).category).toBeNull();
    });

    it("keeps the raw category name", () => {
      expect(expectModule(parseTagCloud({ category: "blog" })).category).toBe("blog");
    });
  });
});
