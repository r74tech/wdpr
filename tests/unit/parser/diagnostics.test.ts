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

    it("nested div with inner unclosed", () => {
      const input = "[[div]]\n[[div]]\nInner content\n[[/div]]";
      const diags = getDiagnostics(input);
      // Outer div is closed by [[/div]], inner div has no close tag
      expect(diags.some((d) => d.code === "unclosed-block")).toBe(true);
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
    it("unclosed div still produces AST elements", () => {
      const result = parse(
        "[[div]]\n[[div]]\n[[div]]\n[[div]]\n[[div]]\nSome content\n[[/div]]\n[[/div]]\n[[/div]]",
      );
      expect(result.ast.elements.length).toBeGreaterThan(0);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });
  });
});
