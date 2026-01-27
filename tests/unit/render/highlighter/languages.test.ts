import { describe, expect, it } from "bun:test";
import { tokenize, renderTokens } from "../../../../packages/render/src/libs/highlighter/engine";
import { javascriptLang } from "../../../../packages/render/src/libs/highlighter/languages/javascript";
import { pythonLang } from "../../../../packages/render/src/libs/highlighter/languages/python";
import { htmlLang } from "../../../../packages/render/src/libs/highlighter/languages/html";
import { cssLang } from "../../../../packages/render/src/libs/highlighter/languages/css";
import { sqlLang } from "../../../../packages/render/src/libs/highlighter/languages/sql";

describe("Language Highlighters", () => {
  describe("JavaScript", () => {
    it("should tokenize keywords with reserved class", () => {
      const tokens = tokenize(javascriptLang, "function test() {}");
      const funcToken = tokens.find((t) => t.content === "function");
      expect(funcToken).toBeDefined();
      expect(funcToken?.class).toBe("reserved");
    });

    it("should tokenize string literals with string class", () => {
      const tokens = tokenize(javascriptLang, 'const str = "hello";');
      const stringToken = tokens.find((t) => t.content.includes("hello"));
      expect(stringToken).toBeDefined();
      expect(stringToken?.class).toBe("string");
    });

    it("should tokenize single-line comments with comment class", () => {
      const tokens = tokenize(javascriptLang, "// comment\ncode");
      const commentToken = tokens.find((t) => t.content.includes("comment"));
      expect(commentToken).toBeDefined();
      expect(commentToken?.class).toBe("comment");
    });

    it("should tokenize multi-line comments", () => {
      const tokens = tokenize(javascriptLang, "/* multi\nline */");
      expect(tokens.some((t) => t.class === "comment")).toBe(true);
    });

    it("should tokenize numbers with number class", () => {
      const tokens = tokenize(javascriptLang, "const x = 42;");
      const numToken = tokens.find((t) => t.content === "42");
      expect(numToken).toBeDefined();
      expect(numToken?.class).toBe("number");
    });

    it("should tokenize brackets with brackets class", () => {
      const tokens = tokenize(javascriptLang, "{ }");
      const openBracket = tokens.find((t) => t.content === "{");
      expect(openBracket).toBeDefined();
      expect(openBracket?.class).toBe("brackets");
    });
  });

  describe("Python", () => {
    it("should tokenize keywords with reserved class", () => {
      const tokens = tokenize(pythonLang, "def test():");
      const defToken = tokens.find((t) => t.content === "def");
      expect(defToken).toBeDefined();
      expect(defToken?.class).toBe("reserved");
    });

    it("should tokenize single-line comments with comment class", () => {
      const tokens = tokenize(pythonLang, "# comment\ncode");
      const commentToken = tokens.find((t) => t.content.includes("comment"));
      expect(commentToken).toBeDefined();
      expect(commentToken?.class).toBe("comment");
    });

    it("should tokenize string literals with string class", () => {
      const tokens = tokenize(pythonLang, 'x = "hello"');
      const stringToken = tokens.find((t) => t.content.includes("hello"));
      expect(stringToken).toBeDefined();
      expect(stringToken?.class).toBe("string");
    });

    it("should tokenize numbers with number class", () => {
      const tokens = tokenize(pythonLang, "x = 3.14");
      const numToken = tokens.find((t) => t.content.includes("3.14"));
      expect(numToken).toBeDefined();
      expect(numToken?.class).toBe("number");
    });
  });

  describe("HTML", () => {
    it("should tokenize tag names with reserved class", () => {
      const tokens = tokenize(htmlLang, "<div></div>");
      const tagToken = tokens.find((t) => t.content === "div");
      expect(tagToken).toBeDefined();
      expect(tagToken?.class).toBe("reserved");
    });

    it("should tokenize attributes with var class", () => {
      const tokens = tokenize(htmlLang, '<div class="test">');
      const attrToken = tokens.find((t) => t.content === "class");
      expect(attrToken).toBeDefined();
      expect(attrToken?.class).toBe("var");
    });

    it("should tokenize comments with comment class", () => {
      const tokens = tokenize(htmlLang, "<!-- comment -->");
      expect(tokens.some((t) => t.class === "comment")).toBe(true);
    });
  });

  describe("CSS", () => {
    it("should tokenize selectors with identifier class", () => {
      const tokens = tokenize(cssLang, ".class { }");
      const selectorToken = tokens.find((t) => t.content.includes(".class"));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.class).toBe("identifier");
    });

    it("should tokenize properties with reserved class", () => {
      const tokens = tokenize(cssLang, "div { color: red; }");
      const propToken = tokens.find((t) => t.content.includes("color"));
      expect(propToken).toBeDefined();
      expect(propToken?.class).toBe("reserved");
    });

    it("should tokenize @rules with var class", () => {
      const tokens = tokenize(cssLang, "@media screen { }");
      const atRuleToken = tokens.find((t) => t.content.includes("@media"));
      expect(atRuleToken).toBeDefined();
      expect(atRuleToken?.class).toBe("var");
    });
  });

  describe("SQL", () => {
    it("should tokenize keywords with reserved class", () => {
      const tokens = tokenize(sqlLang, "SELECT * FROM users");
      const selectToken = tokens.find((t) => t.content === "SELECT");
      expect(selectToken).toBeDefined();
      expect(selectToken?.class).toBe("reserved");
    });

    it("should tokenize strings with string class", () => {
      const tokens = tokenize(sqlLang, "WHERE name = 'test'");
      const stringToken = tokens.find((t) => t.content.includes("test"));
      expect(stringToken).toBeDefined();
      expect(stringToken?.class).toBe("string");
    });

    it("should tokenize comments with comment class", () => {
      const tokens = tokenize(sqlLang, "-- comment\ncode");
      const commentToken = tokens.find((t) => t.content.includes("comment"));
      expect(commentToken).toBeDefined();
      expect(commentToken?.class).toBe("comment");
    });
  });

  describe("Integration", () => {
    it("should render JavaScript to HTML with highlighting", () => {
      const tokens = tokenize(javascriptLang, "const x = 1;");
      const html = renderTokens(tokens);
      expect(html).toContain('<div class="hl-main">');
      expect(html).toContain("</pre></div>");
      expect(html).toContain('<span class="hl-');
    });

    it("should handle multi-line code", () => {
      const code = `function hello() {
  console.log("Hello");
}`;
      const tokens = tokenize(javascriptLang, code);
      const html = renderTokens(tokens);
      expect(html).toContain("function");
      expect(html).toContain("Hello");
    });

    it("should escape HTML in code", () => {
      const tokens = tokenize(javascriptLang, 'const html = "<script>";');
      const html = renderTokens(tokens);
      expect(html).toContain("&lt;script&gt;");
    });
  });
});
