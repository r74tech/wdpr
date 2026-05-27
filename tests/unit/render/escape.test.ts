import { describe, expect, it } from "bun:test";
import type { SyntaxTree, Element } from "@wdprlib/ast";
import { renderToHtml } from "@wdprlib/render";
import {
  escapeHtml,
  escapeAttr,
  escapeStyleContent,
  escapeJsString,
  isSafeAttribute,
  isDangerousUrl,
  sanitizeAttributes,
  isValidCssColor,
  sanitizeCssColor,
  isDangerousCssValue,
  sanitizeStyleValue,
  isValidEmail,
} from "../../../packages/render/src/escape";

describe("escapeHtml", () => {
  it("should escape < > &", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should double-escape already escaped content", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should handle normal text", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  it("should escape all dangerous characters in complex input", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = escapeHtml(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});

describe("escapeAttr", () => {
  it("should escape double quotes", () => {
    expect(escapeAttr('" onload="alert(1)')).not.toContain('"');
    expect(escapeAttr('" onload="alert(1)')).toContain("&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeAttr("' onload='alert(1)")).not.toContain("'");
    expect(escapeAttr("' onload='alert(1)")).toContain("&#39;");
  });

  it("should escape < > &", () => {
    expect(escapeAttr("<>&")).toBe("&lt;&gt;&amp;");
  });

  it("should handle empty string", () => {
    expect(escapeAttr("")).toBe("");
  });

  it("should escape all characters that could break attribute context", () => {
    const input = '"><script>alert(1)</script><a href="';
    const result = escapeAttr(input);
    expect(result).not.toContain('"');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});

describe("escapeStyleContent", () => {
  it("should prevent </style> breakout", () => {
    const input = "body { color: red; }</style><script>alert(1)</script>";
    const result = escapeStyleContent(input);
    expect(result).toContain("<\\/style");
    expect(result).not.toMatch(/<\/style/i);
  });

  it("should be case-insensitive", () => {
    // The regex replaces with escaped version, preserving case in the match
    // The /gi flag makes it case-insensitive for matching
    expect(escapeStyleContent("</STYLE>")).not.toMatch(/<\/style/i);
    expect(escapeStyleContent("</StYlE>")).not.toMatch(/<\/style/i);
  });

  it("should handle multiple occurrences", () => {
    const input = "</style></style></style>";
    const result = escapeStyleContent(input);
    expect(result.match(/<\\\/style/gi)?.length).toBe(3);
  });

  it("should not modify safe content", () => {
    expect(escapeStyleContent("body { color: red; }")).toBe("body { color: red; }");
  });
});

describe("escapeJsString", () => {
  it("should escape single quotes", () => {
    const result = escapeJsString("'; alert(1); '");
    expect(result).not.toContain("'");
    expect(result).toContain("\\x27");
  });

  it("should escape double quotes", () => {
    const result = escapeJsString('"; alert(1); "');
    expect(result).not.toContain('"');
    expect(result).toContain("\\x22");
  });

  it("should escape < and >", () => {
    const result = escapeJsString("<script>alert(1)</script>");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).toContain("\\x3c");
    expect(result).toContain("\\x3e");
  });

  it("should escape ampersand", () => {
    const result = escapeJsString("a & b");
    expect(result).not.toMatch(/(?<!\\x)&/);
  });

  it("should escape line terminators", () => {
    const result = escapeJsString("line1\nline2\rline3");
    expect(result).toContain("\\n");
    expect(result).toContain("\\r");
  });

  it("should escape Unicode line separators", () => {
    const result = escapeJsString("text\u2028more\u2029end");
    expect(result).toContain("\\u2028");
    expect(result).toContain("\\u2029");
  });

  it("should escape backslashes", () => {
    const result = escapeJsString("path\\to\\file");
    expect(result).toContain("\\\\");
  });
});

describe("isSafeAttribute", () => {
  describe("event handlers", () => {
    it("should block onclick", () => {
      expect(isSafeAttribute("onclick")).toBe(false);
    });

    it("should block onload", () => {
      expect(isSafeAttribute("onload")).toBe(false);
    });

    it("should block onerror", () => {
      expect(isSafeAttribute("onerror")).toBe(false);
    });

    it("should block case variations", () => {
      expect(isSafeAttribute("OnClick")).toBe(false);
      expect(isSafeAttribute("ONCLICK")).toBe(false);
      expect(isSafeAttribute("OnLoad")).toBe(false);
    });

    it("should block onmouseover and similar", () => {
      expect(isSafeAttribute("onmouseover")).toBe(false);
      expect(isSafeAttribute("onfocus")).toBe(false);
      expect(isSafeAttribute("onblur")).toBe(false);
    });
  });

  describe("aria-* and data-*", () => {
    it("should allow aria-* attributes", () => {
      expect(isSafeAttribute("aria-label")).toBe(true);
      expect(isSafeAttribute("aria-hidden")).toBe(true);
      expect(isSafeAttribute("aria-describedby")).toBe(true);
    });

    it("should allow data-* attributes", () => {
      expect(isSafeAttribute("data-id")).toBe(true);
      expect(isSafeAttribute("data-custom")).toBe(true);
      expect(isSafeAttribute("data-page-id")).toBe(true);
    });
  });

  describe("safe attributes", () => {
    it("should allow href", () => {
      expect(isSafeAttribute("href")).toBe(true);
    });

    it("should allow src", () => {
      expect(isSafeAttribute("src")).toBe(true);
    });

    it("should allow class", () => {
      expect(isSafeAttribute("class")).toBe(true);
    });

    it("should allow id", () => {
      expect(isSafeAttribute("id")).toBe(true);
    });

    it("should allow style", () => {
      expect(isSafeAttribute("style")).toBe(true);
    });

    it("should allow common HTML attributes", () => {
      expect(isSafeAttribute("title")).toBe(true);
      expect(isSafeAttribute("alt")).toBe(true);
      expect(isSafeAttribute("width")).toBe(true);
      expect(isSafeAttribute("height")).toBe(true);
      expect(isSafeAttribute("target")).toBe(true);
    });
  });

  describe("unknown attributes", () => {
    it("should block unknown attributes", () => {
      expect(isSafeAttribute("custom")).toBe(false);
      expect(isSafeAttribute("xlink:href")).toBe(false);
    });
  });
});

describe("isDangerousUrl", () => {
  describe("javascript: URLs", () => {
    it("should detect lowercase javascript:", () => {
      expect(isDangerousUrl("javascript:alert(1)")).toBe(true);
    });

    it("should detect uppercase JAVASCRIPT:", () => {
      expect(isDangerousUrl("JAVASCRIPT:alert(1)")).toBe(true);
    });

    it("should detect mixed case JavaScript:", () => {
      expect(isDangerousUrl("JavaScript:alert(1)")).toBe(true);
      expect(isDangerousUrl("JaVaScRiPt:alert(1)")).toBe(true);
    });
  });

  describe("data: URLs", () => {
    it("should detect data: URLs", () => {
      expect(isDangerousUrl("data:text/html,<script>alert(1)</script>")).toBe(true);
    });

    it("should detect data: with base64", () => {
      expect(isDangerousUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(
        true,
      );
    });
  });

  describe("vbscript: URLs", () => {
    it("should detect vbscript: URLs", () => {
      expect(isDangerousUrl("vbscript:msgbox(1)")).toBe(true);
      expect(isDangerousUrl("VBSCRIPT:msgbox(1)")).toBe(true);
    });
  });

  describe("evasion techniques", () => {
    it("should detect whitespace evasion", () => {
      expect(isDangerousUrl("java script:alert(1)")).toBe(true);
      expect(isDangerousUrl("java\tscript:alert(1)")).toBe(true);
      expect(isDangerousUrl("java\nscript:alert(1)")).toBe(true);
      expect(isDangerousUrl("java\rscript:alert(1)")).toBe(true);
    });

    it("should detect null byte evasion", () => {
      expect(isDangerousUrl("java\x00script:alert(1)")).toBe(true);
    });

    it("should detect control character evasion", () => {
      expect(isDangerousUrl("java\x01script:alert(1)")).toBe(true);
      expect(isDangerousUrl("java\x0bscript:alert(1)")).toBe(true);
    });

    it("should detect leading whitespace", () => {
      expect(isDangerousUrl("  javascript:alert(1)")).toBe(true);
      expect(isDangerousUrl("\njavascript:alert(1)")).toBe(true);
    });
  });

  describe("safe URLs", () => {
    it("should allow https URLs", () => {
      expect(isDangerousUrl("https://example.com")).toBe(false);
    });

    it("should allow http URLs", () => {
      expect(isDangerousUrl("http://example.com")).toBe(false);
    });

    it("should allow relative URLs", () => {
      expect(isDangerousUrl("/page/test")).toBe(false);
      expect(isDangerousUrl("page/test")).toBe(false);
    });

    it("should allow anchor URLs", () => {
      expect(isDangerousUrl("#anchor")).toBe(false);
    });

    it("should allow mailto: URLs", () => {
      expect(isDangerousUrl("mailto:test@example.com")).toBe(false);
    });

    it("should allow ftp: URLs", () => {
      expect(isDangerousUrl("ftp://files.example.com")).toBe(false);
    });
  });
});

describe("sanitizeAttributes", () => {
  describe("dangerous attribute removal", () => {
    it("should remove onclick", () => {
      const result = sanitizeAttributes({ onclick: "alert(1)", class: "safe" });
      expect(result.onclick).toBeUndefined();
      expect(result.class).toBe("safe");
    });

    it("should remove all event handlers", () => {
      const result = sanitizeAttributes({
        onclick: "alert(1)",
        onload: "alert(2)",
        onerror: "alert(3)",
        class: "safe",
      });
      expect(result.onclick).toBeUndefined();
      expect(result.onload).toBeUndefined();
      expect(result.onerror).toBeUndefined();
      expect(result.class).toBe("safe");
    });

    it("should remove unknown attributes", () => {
      const result = sanitizeAttributes({ custom: "value", id: "test" });
      expect(result.custom).toBeUndefined();
      expect(result.id).toBe("test");
    });
  });

  describe("dangerous URL removal", () => {
    it("should remove dangerous href", () => {
      const result = sanitizeAttributes({ href: "javascript:alert(1)" });
      expect(result.href).toBeUndefined();
    });

    it("should remove dangerous src", () => {
      const result = sanitizeAttributes({ src: "javascript:alert(1)" });
      expect(result.src).toBeUndefined();
    });

    it("should remove dangerous action", () => {
      const result = sanitizeAttributes({ action: "javascript:alert(1)" });
      expect(result.action).toBeUndefined();
    });

    it("should allow safe URLs", () => {
      const result = sanitizeAttributes({
        href: "https://example.com",
        src: "/image.png",
      });
      expect(result.href).toBe("https://example.com");
      expect(result.src).toBe("/image.png");
    });
  });

  describe("preserving safe attributes", () => {
    it("should preserve aria-* attributes", () => {
      const result = sanitizeAttributes({
        "aria-label": "Close",
        "aria-hidden": "true",
      });
      expect(result["aria-label"]).toBe("Close");
      expect(result["aria-hidden"]).toBe("true");
    });

    it("should preserve data-* attributes", () => {
      const result = sanitizeAttributes({
        "data-id": "123",
        "data-page": "test",
      });
      expect(result["data-id"]).toBe("123");
      expect(result["data-page"]).toBe("test");
    });

    it("should preserve common HTML attributes", () => {
      const result = sanitizeAttributes({
        class: "test-class",
        id: "test-id",
        title: "Test Title",
        style: "color: red",
      });
      expect(result.class).toBe("test-class");
      expect(result.id).toBe("test-id");
      expect(result.title).toBe("Test Title");
      expect(result.style).toBe("color: red");
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const result = sanitizeAttributes({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should handle empty values", () => {
      const result = sanitizeAttributes({ class: "", id: "" });
      expect(result.class).toBe("");
      expect(result.id).toBe("");
    });
  });

  describe("style attribute sanitization", () => {
    it("should sanitize style attribute with dangerous values", () => {
      const result = sanitizeAttributes({
        style: "color: red; background: url(javascript:alert(1))",
      });
      expect(result.style).toBe("color: red");
    });

    it("should remove style attribute if all values are dangerous", () => {
      const result = sanitizeAttributes({
        style: "background: url(javascript:alert(1))",
      });
      expect(result.style).toBeUndefined();
    });
  });
});

describe("isValidCssColor", () => {
  describe("named colors", () => {
    it("should accept CSS named colors", () => {
      expect(isValidCssColor("red")).toBe(true);
      expect(isValidCssColor("blue")).toBe(true);
      expect(isValidCssColor("transparent")).toBe(true);
      expect(isValidCssColor("inherit")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isValidCssColor("RED")).toBe(true);
      expect(isValidCssColor("Blue")).toBe(true);
    });
  });

  describe("hex colors", () => {
    it("should accept 3-digit hex", () => {
      expect(isValidCssColor("#f00")).toBe(true);
      expect(isValidCssColor("#abc")).toBe(true);
    });

    it("should accept 6-digit hex", () => {
      expect(isValidCssColor("#ff0000")).toBe(true);
      expect(isValidCssColor("#aabbcc")).toBe(true);
    });

    it("should accept 4 and 8-digit hex (with alpha)", () => {
      expect(isValidCssColor("#f00f")).toBe(true);
      expect(isValidCssColor("#ff0000ff")).toBe(true);
    });
  });

  describe("rgb/rgba colors", () => {
    it("should accept rgb()", () => {
      expect(isValidCssColor("rgb(255, 0, 0)")).toBe(true);
      expect(isValidCssColor("rgb(0,0,0)")).toBe(true);
    });

    it("should accept rgba()", () => {
      expect(isValidCssColor("rgba(255, 0, 0, 0.5)")).toBe(true);
      expect(isValidCssColor("rgba(0,0,0,1)")).toBe(true);
    });
  });

  describe("hsl/hsla colors", () => {
    it("should accept hsl()", () => {
      expect(isValidCssColor("hsl(0, 100%, 50%)")).toBe(true);
    });

    it("should accept hsla()", () => {
      expect(isValidCssColor("hsla(0, 100%, 50%, 0.5)")).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("should reject empty string", () => {
      expect(isValidCssColor("")).toBe(false);
    });

    it("should reject values with semicolons (CSS injection)", () => {
      expect(isValidCssColor("red; background: url(x)")).toBe(false);
    });

    it("should reject url()", () => {
      expect(isValidCssColor("url(http://example.com)")).toBe(false);
    });

    it("should reject expression()", () => {
      expect(isValidCssColor("expression(alert(1))")).toBe(false);
    });

    it("should reject arbitrary strings", () => {
      expect(isValidCssColor("not-a-color")).toBe(false);
    });
  });
});

describe("sanitizeCssColor", () => {
  it("should return valid color as-is", () => {
    expect(sanitizeCssColor("red")).toBe("red");
    expect(sanitizeCssColor("#ff0000")).toBe("#ff0000");
  });

  it("should return fallback for invalid color", () => {
    expect(sanitizeCssColor("invalid")).toBe("inherit");
    expect(sanitizeCssColor("red; background: url(x)")).toBe("inherit");
  });

  it("should use custom fallback", () => {
    expect(sanitizeCssColor("invalid", "black")).toBe("black");
  });
});

describe("isDangerousCssValue", () => {
  it("should detect dangerous url() schemes", () => {
    expect(isDangerousCssValue("url(javascript:alert(1))")).toBe(true);
    expect(isDangerousCssValue("url('javascript:alert(1)')")).toBe(true);
    expect(isDangerousCssValue("url(data:text/html,<script>)")).toBe(true);
    expect(isDangerousCssValue("url(vbscript:msgbox(1))")).toBe(true);
    expect(isDangerousCssValue("url(data:application/javascript,alert(1))")).toBe(true);
    // SVG via data: can execute JS through embedded <script>
    expect(isDangerousCssValue("url(data:image/svg+xml,<svg onload=alert(1)></svg>)")).toBe(true);
    // unknown / opaque schemes also rejected
    expect(isDangerousCssValue("url(x)")).toBe(true);
    expect(isDangerousCssValue("url(ftp://example.com/foo)")).toBe(true);
  });

  it("should allow safe url() schemes", () => {
    expect(isDangerousCssValue("url(http://example.com/files/foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(https://example.org/files/foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(//cdn.example.com/foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(/local--files/foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(./foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(../foo.png)")).toBe(false);
    expect(isDangerousCssValue("url(#anchor)")).toBe(false);
    expect(isDangerousCssValue("url(data:image/png;base64,iVBORw0KGgo)")).toBe(false);
    expect(isDangerousCssValue("url(data:image/jpeg;base64,/9j/4AAQ)")).toBe(false);
    expect(isDangerousCssValue("url(data:image/gif;base64,R0lGODlh)")).toBe(false);
    expect(isDangerousCssValue("url(data:image/webp;base64,UklGR)")).toBe(false);
    // Quoted variants
    expect(isDangerousCssValue("url('http://example.com/image.png')")).toBe(false);
    expect(isDangerousCssValue('url("http://example.com/image.png")')).toBe(false);
  });

  it("should fail-closed on malformed url(", () => {
    // Unclosed url(
    expect(isDangerousCssValue("url(")).toBe(true);
    expect(isDangerousCssValue("url(http://example.com")).toBe(true);
  });

  it("should reject data:image MIME boundary tricks", () => {
    // data:image/png<something> must NOT match the png allowlist entry
    expect(isDangerousCssValue("url(data:image/png+xml,<svg onload=alert(1)></svg>)")).toBe(true);
    expect(isDangerousCssValue("url(data:image/pnganything,foo)")).toBe(true);
    expect(isDangerousCssValue("url(data:image/svg+xml,<svg/>)")).toBe(true);
    // Boundary at `;` or `,` only — both forms must work with allowed MIME
    expect(isDangerousCssValue("url(data:image/png;base64,iVBORw0)")).toBe(false);
    expect(isDangerousCssValue("url(data:image/png,iVBORw0)")).toBe(false);
  });

  it("should respect quoted strings inside url(", () => {
    // `)` inside a quoted URL value must not terminate url( early.
    // (The value itself is unusual but should be accepted because the
    // scheme is http; we test that the walker correctly extracts the
    // full inner string.)
    expect(isDangerousCssValue('url("http://example.com/a)b.png")')).toBe(false);
    expect(isDangerousCssValue("url('http://example.com/a)b.png')")).toBe(false);
  });

  it("should detect CSS escape bypass attempts on dangerous schemes", () => {
    // \72 = 'r' in hex, so u\72l( = url(
    expect(isDangerousCssValue("u\\72l(javascript:alert(1))")).toBe(true);
    // \75 = 'u' in hex
    expect(isDangerousCssValue("\\75rl(javascript:alert(1))")).toBe(true);
    // expression with escapes
    expect(isDangerousCssValue("e\\78pression(alert(1))")).toBe(true);
  });

  it("should detect uppercase hex escape bypass attempts", () => {
    // \55 = 'U' (uppercase), must be lowercased after decode
    expect(isDangerousCssValue("\\55rl(javascript:alert(1))")).toBe(true);
    // \55\52\4c = URL (uppercase)
    expect(isDangerousCssValue("\\55\\52\\4c(javascript:alert(1))")).toBe(true);
  });

  it("should detect CSS line continuation bypass attempts", () => {
    // Backslash + newline is removed in CSS
    expect(isDangerousCssValue("u\\\nrl(javascript:alert(1))")).toBe(true);
    expect(isDangerousCssValue("u\\\rrl(javascript:alert(1))")).toBe(true);
    expect(isDangerousCssValue("u\\\r\nrl(javascript:alert(1))")).toBe(true);
    expect(isDangerousCssValue("@im\\\nport 'evil.css'")).toBe(true);
  });

  it("should detect CSS comment bypass attempts", () => {
    // u/**/rl( = url(
    expect(isDangerousCssValue("u/**/rl(javascript:alert(1))")).toBe(true);
    expect(isDangerousCssValue("ur/*comment*/l(javascript:alert(1))")).toBe(true);
    // @im/**/port = @import
    expect(isDangerousCssValue("@im/**/port 'evil.css'")).toBe(true);
  });

  it("should detect expression() (IE)", () => {
    expect(isDangerousCssValue("expression(alert(1))")).toBe(true);
  });

  it("should detect -moz-binding (Firefox)", () => {
    expect(isDangerousCssValue("-moz-binding: url(x)")).toBe(true);
  });

  it("should detect behavior (IE)", () => {
    expect(isDangerousCssValue("behavior: url(x)")).toBe(true);
  });

  it("should detect @import", () => {
    expect(isDangerousCssValue("@import 'http://evil.com/style.css'")).toBe(true);
  });

  it("should allow safe values without url()", () => {
    expect(isDangerousCssValue("red")).toBe(false);
    expect(isDangerousCssValue("100px")).toBe(false);
    expect(isDangerousCssValue("1px solid #000")).toBe(false);
    expect(isDangerousCssValue("center")).toBe(false);
  });
});

describe("sanitizeStyleValue", () => {
  it("should preserve safe declarations", () => {
    expect(sanitizeStyleValue("color: red")).toBe("color: red");
    expect(sanitizeStyleValue("color: red; font-size: 12px")).toBe("color: red;font-size: 12px");
  });

  it("should remove dangerous declarations", () => {
    expect(sanitizeStyleValue("color: red; background: url(javascript:alert(1))")).toBe(
      "color: red",
    );
  });

  it("should preserve safe url() declarations", () => {
    expect(
      sanitizeStyleValue("background: url(http://example.com/files/foo.png) center/cover"),
    ).toBe("background: url(http://example.com/files/foo.png) center/cover");
    expect(sanitizeStyleValue("background-image: url(/local--files/foo.png)")).toBe(
      "background-image: url(/local--files/foo.png)",
    );
  });

  it("should preserve CSS custom properties with url()", () => {
    // A custom property declaration like `--logo: url(...)` must survive
    // sanitization intact so a downstream rule using `var(--logo)`
    // (e.g. `background: var(--logo)`) can resolve to the image URL.
    expect(sanitizeStyleValue("--logo: url(http://example.com/local--files/foo.png)")).toBe(
      "--logo: url(http://example.com/local--files/foo.png)",
    );
  });

  it("should preserve data:image URLs containing semicolons", () => {
    // Base64 data URLs contain `;base64` -- declaration splitter must not split here
    expect(sanitizeStyleValue("background: url(data:image/png;base64,iVBORw0KGgo)")).toBe(
      "background: url(data:image/png;base64,iVBORw0KGgo)",
    );
  });

  it("should remove expression()", () => {
    expect(sanitizeStyleValue("width: expression(alert(1))")).toBe("");
  });

  it("should remove -moz-binding", () => {
    expect(sanitizeStyleValue("-moz-binding: url(x)")).toBe("");
  });

  it("should remove escaped dangerous property names", () => {
    // `\7a` decodes to `z`, so `-mo\7a-binding` == `-moz-binding`.
    // Pair with a value that would otherwise be allowed (so the only
    // line of defense is the property-name check).
    expect(sanitizeStyleValue("-mo\\7a-binding: url(http://example.com/files/foo.png)")).toBe("");
    expect(sanitizeStyleValue("beh\\61vior: url(http://example.com/files/foo.png)")).toBe("");
  });

  it("should handle empty input", () => {
    expect(sanitizeStyleValue("")).toBe("");
  });
});

describe("renderColor integration", () => {
  const createColorTree = (color: string, text: string): SyntaxTree => ({
    elements: [
      {
        element: "color",
        data: {
          color,
          elements: [{ element: "text", data: text }],
        },
      },
    ] as Element[],
  });

  it("should render valid color", () => {
    const html = renderToHtml(createColorTree("red", "Hello"));
    expect(html).toContain('style="color: red"');
    expect(html).toContain("Hello");
  });

  it("should sanitize invalid color to inherit", () => {
    const html = renderToHtml(createColorTree("invalid-color", "Hello"));
    expect(html).toContain('style="color: inherit"');
  });

  it("should block CSS injection attempt with semicolon", () => {
    const html = renderToHtml(
      createColorTree("red; background: url(javascript:alert(1))", "Hello"),
    );
    // Should not contain the injection payload
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("background:");
    // Should fall back to inherit
    expect(html).toContain('style="color: inherit"');
  });

  it("should block CSS injection attempt with expression()", () => {
    const html = renderToHtml(createColorTree("expression(alert(1))", "Hello"));
    expect(html).not.toContain("expression");
    expect(html).toContain('style="color: inherit"');
  });

  it("should block CSS injection attempt with url()", () => {
    const html = renderToHtml(createColorTree("url(http://evil.com)", "Hello"));
    expect(html).not.toContain("url(");
    expect(html).toContain('style="color: inherit"');
  });

  it("should allow valid hex colors", () => {
    const html = renderToHtml(createColorTree("#ff0000", "Hello"));
    expect(html).toContain('style="color: #ff0000"');
  });

  it("should allow valid rgb colors", () => {
    const html = renderToHtml(createColorTree("rgb(255, 0, 0)", "Hello"));
    expect(html).toContain('style="color: rgb(255, 0, 0)"');
  });
});

describe("isValidEmail", () => {
  it("should accept valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
    expect(isValidEmail("user_name@example.co.uk")).toBe(true);
    expect(isValidEmail("user-name@sub.example.org")).toBe(true);
  });

  it("should reject emails without @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("example.com")).toBe(false);
  });

  it("should reject emails with spaces", () => {
    expect(isValidEmail("test @example.com")).toBe(false);
    expect(isValidEmail("test@ example.com")).toBe(false);
    expect(isValidEmail(" test@example.com")).toBe(false);
  });

  it("should reject emails with dangerous characters", () => {
    expect(isValidEmail("test:foo@example.com")).toBe(false);
    expect(isValidEmail("<script>@example.com")).toBe(false);
    expect(isValidEmail("test>@example.com")).toBe(false);
    expect(isValidEmail('test"@example.com')).toBe(false);
  });

  it("should reject javascript: injection attempts", () => {
    expect(isValidEmail("javascript:alert(1)")).toBe(false);
  });

  it("should reject emails without proper domain", () => {
    expect(isValidEmail("test@")).toBe(false);
    expect(isValidEmail("test@example")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("should reject percent-encoded injection attempts", () => {
    // %0d%0a = CRLF, could inject headers
    expect(isValidEmail("a%0d%0abcc%3aevil@example.com")).toBe(false);
    // %3f = ?, could add query params
    expect(isValidEmail("a%3fsubject%3dX@example.com")).toBe(false);
    // Any percent encoding should be rejected
    expect(isValidEmail("test%40@example.com")).toBe(false);
  });
});

describe("renderEmail integration", () => {
  const createEmailTree = (email: string): SyntaxTree => ({
    elements: [{ element: "email", data: email }] as Element[],
  });

  it("should render valid email as mailto link", () => {
    const html = renderToHtml(createEmailTree("test@example.com"));
    expect(html).toContain('href="mailto:test@example.com"');
    expect(html).toContain(">test@example.com</a>");
  });

  it("should render email with plus sign", () => {
    const html = renderToHtml(createEmailTree("test+tag@example.com"));
    expect(html).toContain('href="mailto:test+tag@example.com"');
  });

  it("should render email with subdomain", () => {
    const html = renderToHtml(createEmailTree("user@mail.example.co.uk"));
    expect(html).toContain('href="mailto:user@mail.example.co.uk"');
  });

  it("should not create link for invalid email (no @)", () => {
    const html = renderToHtml(createEmailTree("notanemail"));
    expect(html).not.toContain("mailto:");
    expect(html).toContain("notanemail");
  });

  it("should not create link for email with spaces", () => {
    const html = renderToHtml(createEmailTree("test @example.com"));
    expect(html).not.toContain("mailto:");
  });

  it("should not create link for javascript: injection attempt", () => {
    const html = renderToHtml(createEmailTree("javascript:alert(1)"));
    expect(html).not.toContain("mailto:");
    // Rendered as plain text (escaped), so javascript: appears but not as a link
    expect(html).not.toContain('href="');
  });

  it("should not create link for XSS attempt in email", () => {
    const html = renderToHtml(createEmailTree("<script>alert(1)</script>@evil.com"));
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("<script>");
  });
});
