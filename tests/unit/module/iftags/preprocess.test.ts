import { describe, test, expect } from "bun:test";
import { preprocessIftags } from "../../../../packages/parser/src/parser/rules/block/module/iftags";

describe("preprocessIftags", () => {
  describe("pass-through", () => {
    test("block-level [[iftags]] is left intact when pageTags is null", () => {
      // null mode defers block-level evaluation to the AST resolver.
      const src = "before [[iftags +foo]]inside[[/iftags]] after";
      expect(preprocessIftags(src, null)).toBe(src);
    });

    test("returns source unchanged when no iftags present", () => {
      expect(preprocessIftags("plain text", ["foo"])).toBe("plain text");
    });

    test("fast-path when source contains no [[ at all", () => {
      expect(preprocessIftags("no brackets here", ["foo"])).toBe("no brackets here");
    });
  });

  describe("null mode: opener-embedded fallback", () => {
    // When pageTags is null the caller could not resolve tag membership.
    // Opener-embedded iftags still have to collapse text-level (otherwise
    // the surrounding block opener fails to tokenize). They are evaluated
    // with an empty-tag assumption: `+tag` fails, `-tag` passes.
    test("collapses opener-embedded iftags with empty-tag fallback (+tag fails)", () => {
      const src = `[[div_ class="x" [[iftags +foo]]style="display:none;"[[/iftags]]]]`;
      expect(preprocessIftags(src, null)).toBe(`[[div_ class="x" ]]`);
    });

    test("collapses opener-embedded iftags with empty-tag fallback (-tag passes)", () => {
      const src = `[[div_ class="x" [[iftags -foo]]style="display:none;"[[/iftags]]]]`;
      expect(preprocessIftags(src, null)).toBe(`[[div_ class="x" style="display:none;"]]`);
    });

    test("leaves opener-embedded iftags inside a [[code]] raw region intact", () => {
      const src = `[[code]][[div_ class="x" [[iftags +foo]]X[[/iftags]]]][[/code]]`;
      expect(preprocessIftags(src, null)).toBe(src);
    });

    test("quoted attribute containing literal ]] does not break depth tracking", () => {
      // The `]]` inside a quoted attribute value must not count as a
      // block-close; otherwise the trailing iftags would be misclassified
      // as block-level and slip through unchanged.
      const src = `[[div_ title="hello ]]" [[iftags +foo]]bad[[/iftags]]]]`;
      expect(preprocessIftags(src, null)).toBe(`[[div_ title="hello ]]" ]]`);
    });

    test("triple-link [[[ ... ]]] does not inflate bracket depth", () => {
      // An iftags appearing AFTER a triple-link must remain block-level.
      const src = `[[[somepage]]]\n[[iftags +foo]]body[[/iftags]]`;
      expect(preprocessIftags(src, null)).toBe(src);
    });

    test("handles nested opener-embedded iftags (innermost first)", () => {
      const src = `[[div_ [[iftags -a]]outer[[iftags +b]]inner[[/iftags]][[/iftags]] ]]`;
      // With pageTags=null, evaluate against []:
      //   inner: +b fails -> ""
      //   then outer: -a passes -> "outer" + "" = "outer"
      expect(preprocessIftags(src, null)).toBe(`[[div_ outer ]]`);
    });

    test("malformed unterminated [[ on a preceding line does not swallow later block-level iftags", () => {
      // Without a depth reset at newline boundaries, the leading
      // `[[broken` would keep depth > 0 across the newline and the
      // second line's iftags would be misclassified as opener-embedded.
      // The depth must reset at `\n` so that block-level iftags after
      // a malformed line are still left for the AST resolver.
      const src = `[[broken
[[iftags +foo]]body[[/iftags]]`;
      expect(preprocessIftags(src, null)).toBe(src);
    });
  });

  describe("flat substitution", () => {
    test("keeps body when condition matches required tag", () => {
      const src = "before [[iftags +foo]]inside[[/iftags]] after";
      expect(preprocessIftags(src, ["foo"])).toBe("before inside after");
    });

    test("removes body when required tag missing", () => {
      const src = "before [[iftags +foo]]inside[[/iftags]] after";
      expect(preprocessIftags(src, [])).toBe("before  after");
    });

    test("removes body when forbidden tag present", () => {
      const src = "[[iftags -admin]]content[[/iftags]]";
      expect(preprocessIftags(src, ["admin"])).toBe("");
    });

    test("keeps body when forbidden tag absent", () => {
      const src = "[[iftags -admin]]content[[/iftags]]";
      expect(preprocessIftags(src, ["user"])).toBe("content");
    });

    test("processes multiple sibling iftags", () => {
      const src = "[[iftags +a]]A[[/iftags]] [[iftags +b]]B[[/iftags]]";
      expect(preprocessIftags(src, ["a"])).toBe("A ");
      expect(preprocessIftags(src, ["b"])).toBe(" B");
      expect(preprocessIftags(src, ["a", "b"])).toBe("A B");
    });
  });

  describe("nested iftags", () => {
    test("matching outer and inner keep both bodies", () => {
      const src = "[[iftags +o]]X [[iftags +i]]Y[[/iftags]] Z[[/iftags]]";
      expect(preprocessIftags(src, ["o", "i"])).toBe("X Y Z");
    });

    test("matching outer with non-matching inner strips inner only", () => {
      const src = "[[iftags +o]]X [[iftags +i]]Y[[/iftags]] Z[[/iftags]]";
      expect(preprocessIftags(src, ["o"])).toBe("X  Z");
    });

    test("non-matching outer removes whole tree including inner", () => {
      const src = "[[iftags +o]]X [[iftags +i]]Y[[/iftags]] Z[[/iftags]]";
      expect(preprocessIftags(src, ["i"])).toBe("");
    });

    test("triple-nested", () => {
      const src = "[[iftags +a]]A[[iftags +b]]B[[iftags +c]]C[[/iftags]][[/iftags]][[/iftags]]";
      expect(preprocessIftags(src, ["a", "b", "c"])).toBe("ABC");
      expect(preprocessIftags(src, ["a", "b"])).toBe("AB");
      expect(preprocessIftags(src, ["a"])).toBe("A");
      expect(preprocessIftags(src, [])).toBe("");
    });
  });

  describe("raw region protection", () => {
    test("does not touch [[iftags]] inside [[code]]", () => {
      const src = "[[code]]\n[[iftags +foo]]nope[[/iftags]]\n[[/code]]";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("does not touch [[iftags]] inside [[html]]", () => {
      const src = "[[html]]\n[[iftags +foo]]nope[[/iftags]]\n[[/html]]";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("does not touch [[iftags]] inside @@...@@", () => {
      const src = "@@[[iftags +foo]]nope[[/iftags]]@@";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("does not touch [[iftags]] inside @<...>@", () => {
      const src = "@<[[iftags +foo]]nope[[/iftags]]>@";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("@@..@@ does not cross newline (so multi-line iftags inside is processed)", () => {
      // The @@ at line 1 has no closing @@ on the same line, so it is
      // NOT a raw region. The [[iftags]] is therefore processed.
      const src = "@@\n[[iftags +foo]]X[[/iftags]]\n@@";
      const out = preprocessIftags(src, ["foo"]);
      expect(out).toBe("@@\nX\n@@");
    });

    test("preserves @@ raw block when iftags body contains it", () => {
      const src = "[[iftags +foo]] @@raw@@ inside [[/iftags]]";
      expect(preprocessIftags(src, ["foo"])).toBe(" @@raw@@ inside ");
    });
  });

  describe("iftags embedded inside a block opener's attribute string", () => {
    const template =
      `[[div_ class="x" [[iftags +foo]]style="display:none;"[[/iftags]]]]\n` + `content\n[[/div]]`;

    test("matching tag expands to attribute", () => {
      expect(preprocessIftags(template, ["foo"])).toBe(
        `[[div_ class="x" style="display:none;"]]\ncontent\n[[/div]]`,
      );
    });

    test("non-matching tag expands to empty", () => {
      expect(preprocessIftags(template, [])).toBe(`[[div_ class="x" ]]\ncontent\n[[/div]]`);
    });
  });

  describe("raw region edge cases", () => {
    test("unclosed [[code]] consumes to EOF (literal iftags inside stays literal)", () => {
      // Block parser falls through to "code until EOF" with a warning, so
      // preprocess must mirror that — otherwise an iftags inside the
      // unclosed code would be expanded while the parser still treats
      // it as raw content.
      const src = "[[code]]\n[[iftags +foo]]nope[[/iftags]]\n(no close)";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("unclosed [[html]] does NOT mask trailing iftags (parser drops it to text)", () => {
      // The block parser fails on unclosed `[[html]]` and falls back to
      // literal text, so anything after it is normal wikitext that
      // preprocess must still see and expand.
      const src = "[[html]]\nhtml body without close\n[[iftags +foo]]X[[/iftags]]";
      const out = preprocessIftags(src, ["foo"]);
      expect(out).toContain("X");
      expect(out).not.toContain("[[iftags");
    });

    test("@<...>@ does NOT span newlines (Wikidot raw rule)", () => {
      // The parser only treats `@<...>@` as raw when `>@` is on the same
      // line as `@<`. If the closing marker is on a different line, the
      // characters become literal text and any [[iftags]] in between is
      // ordinary content — so preprocess must still expand it.
      const src = "@<\n[[iftags +foo]]X[[/iftags]]\n>@";
      const out = preprocessIftags(src, ["foo"]);
      expect(out).toContain("X");
      expect(out).not.toContain("[[iftags");
    });

    test("source containing the placeholder sentinel survives roundtrip", () => {
      // The placeholder uses Private Use Area characters that should not
      // appear in legitimate wikitext, but if they do (pasted content,
      // hostile input), the unique-sentinel fallback must keep restore
      // unambiguous.
      const opener = "";
      const closer = "";
      const src = `before ${opener}0${closer} [[iftags +foo]]X[[/iftags]] after`;
      expect(preprocessIftags(src, ["foo"])).toBe(`before ${opener}0${closer} X after`);
    });
  });

  describe("Wikidot rule order: iftags runs before comment", () => {
    test("an [[iftags]] inside a [!-- --] is expanded by this pass", () => {
      // Wikidot's Text_Wiki runs the Iftags rule (index 11) before the
      // Comment rule (index 12), so the iftags is evaluated first and the
      // (now-flattened) text is left for the parser's comment rule to
      // strip. preprocess must mirror that order — masking comments here
      // would invert it.
      const src = "a[!-- [[iftags +foo]]X[[/iftags]] --]b";
      expect(preprocessIftags(src, ["foo"])).toBe("a[!-- X --]b");
      expect(preprocessIftags(src, [])).toBe("a[!--  --]b");
    });
  });

  describe("edge cases", () => {
    test("unclosed [[iftags]] is left intact", () => {
      const src = "before [[iftags +foo]]inside without close";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("orphan [[/iftags]] is left intact", () => {
      const src = "before [[/iftags]] after";
      expect(preprocessIftags(src, ["foo"])).toBe(src);
    });

    test("empty condition (super-comment-out) removes body", () => {
      const src = "[[iftags]]hidden always[[/iftags]] visible";
      expect(preprocessIftags(src, ["any"])).toBe(" visible");
    });

    test("case-insensitive block name", () => {
      const src = "[[IFTAGS +foo]]X[[/IFTAGS]]";
      expect(preprocessIftags(src, ["foo"])).toBe("X");
    });

    test("whitespace inside [[ iftags ...]] is tolerated", () => {
      const src = "[[ iftags +foo ]]X[[/ iftags ]]";
      expect(preprocessIftags(src, ["foo"])).toBe("X");
    });
  });
});
