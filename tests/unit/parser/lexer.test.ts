import { describe, expect, it } from "bun:test";
import { tokenize } from "@wdprlib/parser";

/**
 * Helper to get token types from source
 */
function getTokenTypes(source: string): string[] {
  return tokenize(source).map((t) => t.type);
}

describe("Lexer", () => {
  describe("basic tokenization", () => {
    it("should tokenize empty string", () => {
      const tokens = tokenize("");
      expect(tokens.length).toBe(1);
      expect(tokens[0]?.type).toBe("EOF");
    });

    it("should tokenize plain text", () => {
      const tokens = tokenize("hello world");
      expect(getTokenTypes(tokens.map((t) => t.value).join(""))).toContain("IDENTIFIER");
    });

    it("should tokenize newlines", () => {
      const types = getTokenTypes("line1\nline2");
      expect(types).toContain("NEWLINE");
    });

    it("should tokenize whitespace", () => {
      const types = getTokenTypes("  \t  ");
      expect(types).toContain("WHITESPACE");
    });

    it("should coalesce long non-ASCII plain text", () => {
      const source = "あ".repeat(64);
      const tokens = tokenize(source);

      expect(tokens).toHaveLength(2);
      expect(tokens[0]?.type).toBe("TEXT");
      expect(tokens[0]?.value).toBe(source);
      expect(tokens[0]?.position.start.offset).toBe(0);
      expect(tokens[0]?.position.end.offset).toBe(source.length);
      expect(tokens[1]?.type).toBe("EOF");
    });

    it("should compact ordinary text only when requested", () => {
      const source = "hello world; plain text.";
      expect(tokenize(source).some((token) => token.type === "IDENTIFIER")).toBe(true);

      const tokens = tokenize(source, { compactTextRuns: true });
      expect(tokens[0]?.type).toBe("TEXT");
      expect(tokens[0]?.value).toBe(source);
      expect(tokens[1]?.type).toBe("EOF");
    });

    it("should keep block openers tokenized while compacting text", () => {
      const tokens = tokenize('before [[div class="x"]]inside[[/div]] after', {
        compactTextRuns: true,
      });

      expect(tokens.map((token) => token.type)).toContain("BLOCK_OPEN");
      expect(tokens.map((token) => token.type)).toContain("BLOCK_END_OPEN");
      expect(tokens.some((token) => token.type === "IDENTIFIER" && token.value === "div")).toBe(
        true,
      );
      expect(tokens.some((token) => token.type === "QUOTED_STRING" && token.value === '"x"')).toBe(
        true,
      );
    });
  });

  describe("block syntax", () => {
    it("should tokenize block open [[", () => {
      const types = getTokenTypes("[[div]]");
      expect(types).toContain("BLOCK_OPEN");
    });

    it("should tokenize block close ]]", () => {
      const types = getTokenTypes("[[div]]");
      expect(types).toContain("BLOCK_CLOSE");
    });

    it("should tokenize block end open [[/", () => {
      const types = getTokenTypes("[[/div]]");
      expect(types).toContain("BLOCK_END_OPEN");
    });
  });

  describe("inline formatting", () => {
    it("should tokenize bold **", () => {
      const types = getTokenTypes("**bold**");
      expect(types.filter((t) => t === "BOLD_MARKER").length).toBe(2);
    });

    it("should tokenize italic //", () => {
      const types = getTokenTypes("//italic//");
      expect(types.filter((t) => t === "ITALIC_MARKER").length).toBe(2);
    });

    it("should tokenize underline __", () => {
      const types = getTokenTypes("__underline__");
      expect(types.filter((t) => t === "UNDERLINE_MARKER").length).toBe(2);
    });

    it("should tokenize strikethrough --", () => {
      const types = getTokenTypes("--strike--");
      expect(types.filter((t) => t === "STRIKE_MARKER").length).toBe(2);
    });

    it("should tokenize superscript ^^", () => {
      const types = getTokenTypes("^^super^^");
      expect(types.filter((t) => t === "SUPER_MARKER").length).toBe(2);
    });

    it("should tokenize subscript ,,", () => {
      const types = getTokenTypes(",,sub,,");
      expect(types.filter((t) => t === "SUB_MARKER").length).toBe(2);
    });

    it("should tokenize monospace {{ }}", () => {
      const types = getTokenTypes("{{code}}");
      expect(types).toContain("MONO_MARKER");
      expect(types).toContain("MONO_CLOSE");
    });
  });

  describe("links", () => {
    it("should tokenize link open [[[", () => {
      const types = getTokenTypes("[[[link]]]");
      expect(types).toContain("LINK_OPEN");
    });

    it("should tokenize link close ]]]", () => {
      const types = getTokenTypes("[[[link]]]");
      expect(types).toContain("LINK_CLOSE");
    });
  });

  describe("raw/escape", () => {
    it("should tokenize raw open @@", () => {
      const types = getTokenTypes("@@raw@@");
      expect(types.filter((t) => t === "RAW_OPEN").length).toBe(2);
    });

    it("should tokenize raw block @< >@", () => {
      const types = getTokenTypes("@<raw>@");
      expect(types).toContain("RAW_BLOCK_OPEN");
      expect(types).toContain("RAW_BLOCK_CLOSE");
    });
  });

  describe("line-start dependent syntax", () => {
    it("should tokenize heading + at line start", () => {
      const types = getTokenTypes("+ Heading");
      expect(types).toContain("HEADING_MARKER");
    });

    it("should tokenize multiple + for deeper headings", () => {
      const tokens = tokenize("+++ Heading 3");
      const headingToken = tokens.find((t) => t.type === "HEADING_MARKER");
      expect(headingToken?.value).toBe("+++");
    });

    it("should not tokenize heading + in middle of line", () => {
      const types = getTokenTypes("text + more");
      expect(types).not.toContain("HEADING_MARKER");
    });

    it("should tokenize list bullet * at line start", () => {
      const types = getTokenTypes("* item");
      expect(types).toContain("LIST_BULLET");
    });

    it("should not tokenize list bullet * in middle of line", () => {
      const types = getTokenTypes("text * more");
      expect(types).not.toContain("LIST_BULLET");
    });

    it("should tokenize list number # at line start", () => {
      const types = getTokenTypes("# item");
      expect(types).toContain("LIST_NUMBER");
    });

    it("should tokenize blockquote > at line start", () => {
      const types = getTokenTypes("> quote");
      expect(types).toContain("BLOCKQUOTE_MARKER");
    });

    it("should tokenize horizontal rule ---- at line start", () => {
      const types = getTokenTypes("----");
      expect(types).toContain("HR_MARKER");
    });

    it("should tokenize table || at line start", () => {
      const types = getTokenTypes("|| cell ||");
      expect(types).toContain("TABLE_MARKER");
    });
  });

  describe("position tracking", () => {
    it("should track line and column", () => {
      const tokens = tokenize("ab\ncd");
      const newlineIdx = tokens.findIndex((t) => t.type === "NEWLINE");
      const tokenAfterNewline = tokens[newlineIdx + 1];
      expect(tokenAfterNewline?.position.start.line).toBe(2);
      expect(tokenAfterNewline?.position.start.column).toBe(1);
    });

    it("should track offset", () => {
      // With IDENTIFIER token, "abc" becomes a single IDENTIFIER token
      const tokens = tokenize("abc");
      const identTokens = tokens.filter((t) => t.type === "IDENTIFIER");
      expect(identTokens.length).toBe(1);
      expect(identTokens[0]?.position.start.offset).toBe(0);
      expect(identTokens[0]?.position.end.offset).toBe(3);
    });
  });

  describe("lineStart flag", () => {
    it("should mark first token as lineStart", () => {
      const tokens = tokenize("hello");
      expect(tokens[0]?.lineStart).toBe(true);
    });

    it("should mark token after newline as lineStart", () => {
      const tokens = tokenize("a\nb");
      const tokenAfterNewline = tokens.find((_, i) => i > 0 && tokens[i - 1]?.type === "NEWLINE");
      expect(tokenAfterNewline?.lineStart).toBe(true);
    });
  });

  describe("blockquote prefix", () => {
    it("should tokenize heading markers after the prefix", () => {
      const tokens = tokenize("> +++ A");
      expect(tokens.map((t) => [t.type, t.value, t.lineStart])).toEqual([
        ["BLOCKQUOTE_MARKER", ">", true],
        ["WHITESPACE", " ", false],
        ["HEADING_MARKER", "+++", true],
        ["WHITESPACE", " ", false],
        ["IDENTIFIER", "A", false],
        ["EOF", "", false],
      ]);
    });

    it("should split the prefix space from the content indent", () => {
      const tokens = tokenize(">  * b");
      expect(tokens.map((t) => [t.type, t.value, t.lineStart])).toEqual([
        ["BLOCKQUOTE_MARKER", ">", true],
        ["WHITESPACE", " ", false],
        ["WHITESPACE", " ", true],
        ["LIST_BULLET", "*", false],
        ["WHITESPACE", " ", false],
        ["IDENTIFIER", "b", false],
        ["EOF", "", false],
      ]);
    });

    it("should keep an indented heading marker off line start", () => {
      const marker = tokenize(">   +++ A").find((t) => t.type === "HEADING_MARKER");
      expect(marker?.lineStart).toBe(false);
    });

    it("should not treat a tab as the prefix space", () => {
      expect(getTokenTypes(">\t+++ A")).not.toContain("HEADING_MARKER");
    });

    it("should not nest on a > inside quoted content", () => {
      const markers = tokenize("> > deep").filter((t) => t.type === "BLOCKQUOTE_MARKER");
      expect(markers).toHaveLength(1);
    });

    it("should clear the prefix line start once content begins", () => {
      expect(getTokenTypes('> "+++ A')).not.toContain("HEADING_MARKER");
    });

    it("should apply the prefix at any depth", () => {
      const tokens = tokenize(">> +++ A");
      expect(tokens[0]?.value).toBe(">>");
      expect(tokens.find((t) => t.type === "HEADING_MARKER")?.lineStart).toBe(true);
    });
  });
});
