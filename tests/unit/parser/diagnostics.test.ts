import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import type { Diagnostic } from "@wdprlib/ast";

function getDiagnostics(input: string): Diagnostic[] {
  return parse(input).diagnostics;
}

function getCodes(input: string): string[] {
  return getDiagnostics(input).map((d) => d.code);
}

describe("Diagnostics", () => {
  describe("clean input produces no diagnostics", () => {
    it("empty string", () => {
      expect(getDiagnostics("")).toEqual([]);
    });

    it("plain text", () => {
      expect(getDiagnostics("Hello world")).toEqual([]);
    });

    it("properly closed div", () => {
      expect(getDiagnostics("[[div]]\nContent\n[[/div]]")).toEqual([]);
    });

    it("properly closed collapsible", () => {
      expect(getDiagnostics("[[collapsible]]\nContent\n[[/collapsible]]")).toEqual([]);
    });

    it("properly closed tabview with tab", () => {
      expect(getDiagnostics("[[tabview]]\n[[tab Title]]\nContent\n[[/tab]]\n[[/tabview]]")).toEqual(
        [],
      );
    });

    it("properly closed align", () => {
      expect(getDiagnostics("[[=]]\nCentered\n[[/=]]")).toEqual([]);
    });

    it("properly closed iftags", () => {
      expect(getDiagnostics("[[iftags +scp]]\nContent\n[[/iftags]]")).toEqual([]);
    });
  });

  describe("unclosed-block", () => {
    it("unclosed div", () => {
      const diags = getDiagnostics("[[div]]\nContent without close tag");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.severity).toBe("warning");
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[div]]");
    });

    it("unclosed div_", () => {
      const diags = getDiagnostics("[[div_]]\nContent");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
    });

    it("unclosed collapsible", () => {
      const diags = getDiagnostics("[[collapsible]]\nContent without close");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.severity).toBe("warning");
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[collapsible]]");
    });

    it("unclosed iftags", () => {
      const diags = getDiagnostics("[[iftags +scp]]\nContent");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[iftags]]");
    });

    it("unclosed center align", () => {
      const diags = getDiagnostics("[[=]]\nCentered text");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[=]]");
    });

    it("unclosed right align", () => {
      const diags = getDiagnostics("[[>]]\nRight aligned");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[>]]");
    });

    it("unclosed justify align", () => {
      const diags = getDiagnostics("[[==]]\nJustified text");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[==]]");
    });

    it("nested div with inner unclosed — budget blocks excess open", () => {
      const input = "[[div]]\n[[div]]\nInner content\n[[/div]]";
      const diags = getDiagnostics(input);
      // 2 opens, 1 close: budget blocks the inner open → it becomes text.
      // No unclosed-block because the outer div closes normally.
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(false);
    });

    it("unclosed code", () => {
      const diags = getDiagnostics("[[code]]\nsome code here");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[code]]");
    });

    it("unclosed math", () => {
      const diags = getDiagnostics("[[math]]\nx^2 + y^2 = z^2");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[math]]");
    });

    it("unclosed html", () => {
      const diags = getDiagnostics("[[html]]\n<p>hello</p>");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[html]]");
    });

    it("unclosed embed", () => {
      const diags = getDiagnostics("[[embed]]\n<iframe></iframe>");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[embed]]");
    });

    it("unclosed module CSS", () => {
      const diags = getDiagnostics("[[module CSS]]\n.foo { color: red; }");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[module]]");
    });

    it("unclosed anchor", () => {
      const diags = getDiagnostics('[[a href="#"]]link text without close');
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[/a]]");
    });

    it("unclosed footnote", () => {
      const diags = getDiagnostics("[[footnote]]note without close");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[footnote]]");
    });

    it("unclosed span", () => {
      const diags = getDiagnostics("[[span]]text without close");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[span]]");
    });

    it("unclosed size", () => {
      const diags = getDiagnostics("[[size 120%]]large text without close");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[size]]");
    });

    it("unclosed bibliography", () => {
      const diags = getDiagnostics("[[bibliography]]\n: ref1 : Some reference");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[bibliography]]");
    });

    it("unclosed tabview", () => {
      const diags = getDiagnostics("[[tabview]]\n[[tab Title]]\nContent\n[[/tab]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed tab", () => {
      const diags = getDiagnostics("[[tabview]]\n[[tab Title]]\nContent\n[[/tabview]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed ul", () => {
      const diags = getDiagnostics("[[ul]]\n[[li]]Item[[/li]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed ol", () => {
      const diags = getDiagnostics("[[ol]]\n[[li]]Item[[/li]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed table", () => {
      const diags = getDiagnostics("[[table]]\n[[row]]\n[[cell]]Content[[/cell]]\n[[/row]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed row", () => {
      const diags = getDiagnostics("[[table]]\n[[row]]\n[[cell]]Content[[/cell]]\n[[/table]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed cell", () => {
      const diags = getDiagnostics("[[table]]\n[[row]]\n[[cell]]Content\n[[/row]]\n[[/table]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed hcell", () => {
      const diags = getDiagnostics("[[table]]\n[[row]]\n[[hcell]]Header\n[[/row]]\n[[/table]]");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed embedvideo", () => {
      const diags = getDiagnostics("[[embedvideo]]\n<video></video>");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
    });

    it("unclosed embedaudio", () => {
      const diags = getDiagnostics("[[embedaudio]]\n<audio></audio>");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
    });

    it("unclosed orphan li", () => {
      const diags = getDiagnostics("[[li]]content without close");
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
    });

    it("unclosed li inside list", () => {
      const diags = getDiagnostics("[[ul]]\n[[li]]Item\n[[/ul]]");
      expect(diags.some((d) => d.code === "unclosed-block" && d.message.includes("[[/li]]"))).toBe(
        true,
      );
    });

    it("unclosed left align", () => {
      const diags = getDiagnostics("[[<]]\nLeft aligned");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.code).toBe("unclosed-block");
      expect(diags[0]!.message).toContain("[[<]]");
    });
  });

  describe("unclosed-comment", () => {
    it("unterminated block comment", () => {
      const diags = getDiagnostics("[!-- unclosed comment");
      expect(diags.some((d) => d.code === "unclosed-comment")).toBe(true);
    });

    it("unterminated inline comment", () => {
      const diags = getDiagnostics("text [!-- unclosed");
      expect(diags.some((d) => d.code === "unclosed-comment")).toBe(true);
    });
  });

  describe("clean inline input produces no diagnostics", () => {
    it("properly closed span", () => {
      expect(getDiagnostics("[[span]]text[[/span]]")).toEqual([]);
    });

    it("properly closed size", () => {
      expect(getDiagnostics("[[size 120%]]text[[/size]]")).toEqual([]);
    });

    it("properly closed code", () => {
      expect(getDiagnostics("[[code]]\nfoo\n[[/code]]")).toEqual([]);
    });

    it("properly closed math", () => {
      expect(getDiagnostics("[[math]]\nx^2\n[[/math]]")).toEqual([]);
    });

    it("properly closed html", () => {
      expect(getDiagnostics("[[html]]\n<p>hi</p>\n[[/html]]")).toEqual([]);
    });

    it("properly closed anchor", () => {
      expect(getDiagnostics('[[a href="#"]]link[[/a]]')).toEqual([]);
    });

    it("properly closed footnote", () => {
      expect(getDiagnostics("[[footnote]]note[[/footnote]]")).toEqual([]);
    });

    it("properly closed bibliography", () => {
      expect(getDiagnostics("[[bibliography]]\n: ref1 : Reference\n[[/bibliography]]")).toEqual([]);
    });

    it("properly closed comment", () => {
      expect(getDiagnostics("[!-- comment --]")).toEqual([]);
    });

    it("properly closed block list", () => {
      expect(getDiagnostics("[[ul]]\n[[li]]Item[[/li]]\n[[/ul]]")).toEqual([]);
    });

    it("properly closed ol", () => {
      expect(getDiagnostics("[[ol]]\n[[li]]Item[[/li]]\n[[/ol]]")).toEqual([]);
    });

    it("properly closed table", () => {
      expect(
        getDiagnostics("[[table]]\n[[row]]\n[[cell]]Content[[/cell]]\n[[/row]]\n[[/table]]"),
      ).toEqual([]);
    });

    it("properly closed embed", () => {
      expect(getDiagnostics("[[embed]]\n<iframe></iframe>\n[[/embed]]")).toEqual([]);
    });

    it("properly closed module CSS", () => {
      expect(getDiagnostics("[[module CSS]]\n.foo { color: red; }\n[[/module]]")).toEqual([]);
    });
  });

  describe("inline-block-element", () => {
    it("inline div without newline after ]]", () => {
      const diags = getDiagnostics("[[div]]inline text[[/div]]");
      expect(diags).toHaveLength(1);
      expect(diags[0]!.severity).toBe("error");
      expect(diags[0]!.code).toBe("inline-block-element");
    });
  });

  describe("position tracking", () => {
    it("reports correct line number for unclosed div", () => {
      const input = "First line\n\n[[div]]\nContent";
      const diags = getDiagnostics(input);
      expect(diags).toHaveLength(1);
      expect(diags[0]!.position.start.line).toBe(3);
    });

    it("reports correct line for inline div", () => {
      const input = "[[div]]inline[[/div]]";
      const diags = getDiagnostics(input);
      expect(diags).toHaveLength(1);
      expect(diags[0]!.position.start.line).toBe(1);
    });
  });

  describe("multiple diagnostics", () => {
    it("multiple unclosed blocks", () => {
      const input = "[[div]]\n[[collapsible]]\nContent";
      const codes = getCodes(input);
      // Both div and collapsible are unclosed
      expect(codes.filter((c) => c === "unclosed-block").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("AST is still produced with diagnostics", () => {
    it("excess div opens become text, all opened divs close normally", () => {
      const result = parse(
        "[[div]]\n[[div]]\n[[div]]\n[[div]]\n[[div]]\nSome content\n[[/div]]\n[[/div]]\n[[/div]]",
      );
      // 5 opens, 3 closes: budget blocks the 4th and 5th opens → text.
      // The 3 opened divs match the 3 closes → no diagnostics.
      expect(result.ast.elements.length).toBeGreaterThan(0);
      expect(result.diagnostics.length).toBe(0);
    });
  });
});
