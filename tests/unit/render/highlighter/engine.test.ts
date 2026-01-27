import { describe, expect, it } from "bun:test";
import { tokenize, renderTokens } from "../../../../packages/render/src/libs/highlighter/engine";
import type { LanguageDefinition } from "../../../../packages/render/src/libs/highlighter/types";

describe("Highlighter Engine", () => {
  // Minimal language definition for testing
  function createMinimalDef(opts?: Partial<LanguageDefinition>): LanguageDefinition {
    return {
      language: "test",
      defClass: "default",
      regs: { [-1]: null },
      counts: { [-1]: [] },
      delim: { [-1]: [] },
      inner: { [-1]: [] },
      end: {},
      states: { [-1]: [] },
      keywords: { [-1]: [] },
      kwmap: {},
      parts: {},
      subst: {},
      ...opts,
    };
  }

  describe("tokenize", () => {
    it("should handle empty input", () => {
      const def = createMinimalDef();
      const tokens = tokenize(def, "");
      expect(tokens).toEqual([]);
    });

    it("should handle whitespace-only input", () => {
      const def = createMinimalDef();
      const tokens = tokenize(def, "   ");
      // rtrim removes trailing whitespace
      expect(tokens).toEqual([]);
    });

    it("should normalize CRLF to LF", () => {
      const def = createMinimalDef();
      const tokens = tokenize(def, "line1\r\nline2");
      const content = tokens.map((t) => t.content).join("");
      expect(content).not.toContain("\r\n");
      expect(content).toContain("\n");
    });

    it("should convert tabs to 4 spaces", () => {
      const def = createMinimalDef();
      const tokens = tokenize(def, "\tindented");
      const content = tokens.map((t) => t.content).join("");
      expect(content).not.toContain("\t");
      expect(content).toContain("    ");
    });

    it("should replace empty lines with space", () => {
      const def = createMinimalDef();
      const tokens = tokenize(def, "line1\n\nline2");
      const content = tokens.map((t) => t.content).join("");
      // Empty line becomes a space
      expect(content).toContain("line1\n \nline2");
    });

    it("should use default class for unmatched text", () => {
      const def = createMinimalDef({ defClass: "code" });
      const tokens = tokenize(def, "hello world");
      expect(tokens.length).toBe(1);
      expect(tokens[0]?.class).toBe("code");
      expect(tokens[0]?.content).toBe("hello world");
    });
  });

  describe("renderTokens", () => {
    it("should return empty string for empty tokens", () => {
      const html = renderTokens([]);
      expect(html).toBe("");
    });

    it("should wrap tokens in spans with hl- prefix", () => {
      const tokens = [{ class: "keyword", content: "function" }];
      const html = renderTokens(tokens);
      expect(html).toContain('<span class="hl-keyword">function</span>');
    });

    it("should merge adjacent tokens with same class", () => {
      const tokens = [
        { class: "code", content: "hello" },
        { class: "code", content: " world" },
      ];
      const html = renderTokens(tokens);
      expect(html).toContain('<span class="hl-code">hello world</span>');
    });

    it("should wrap output in div.hl-main > pre", () => {
      const tokens = [{ class: "code", content: "test" }];
      const html = renderTokens(tokens);
      expect(html).toMatch(/^<div class="hl-main"><pre>/);
      expect(html).toMatch(/<\/pre><\/div>$/);
    });

    it("should escape HTML entities in content", () => {
      const tokens = [{ class: "code", content: "<script>&</script>" }];
      const html = renderTokens(tokens);
      expect(html).toContain("&lt;script&gt;&amp;&lt;/script&gt;");
    });

    it("should skip empty content tokens", () => {
      const tokens = [
        { class: "a", content: "" },
        { class: "b", content: "text" },
        { class: "c", content: "" },
      ];
      const html = renderTokens(tokens);
      expect(html).toContain('<span class="hl-b">text</span>');
      expect(html).not.toContain("hl-a");
      expect(html).not.toContain("hl-c");
    });
  });
});
