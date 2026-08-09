import { describe, expect, it } from "bun:test";
import { classifyNavigation } from "../../../examples/wdmock-cf/apps/main/src/client/navigation";

const CURRENT_URL = "https://example.test/current?old=1";

describe("classifyNavigation", () => {
  it.each([
    {
      name: "ASCII relative page",
      href: "next-page",
      expected: { kind: "internal", pagePath: "next-page", historyHref: "/next-page" },
    },
    {
      name: "CJK root-relative page",
      href: "/日本語ページ",
      expected: {
        kind: "internal",
        pagePath: "%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%9A%E3%83%BC%E3%82%B8",
        historyHref: "/%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%9A%E3%83%BC%E3%82%B8",
      },
    },
    {
      name: "same-origin absolute HTTPS URL",
      href: "https://example.test/absolute",
      expected: { kind: "internal", pagePath: "absolute", historyHref: "/absolute" },
    },
    {
      name: "same-origin protocol-relative URL",
      href: "//example.test/protocol-relative",
      expected: {
        kind: "internal",
        pagePath: "protocol-relative",
        historyHref: "/protocol-relative",
      },
    },
    {
      name: "same-origin query and hash",
      href: "?view=compact#top",
      expected: {
        kind: "internal",
        pagePath: "current",
        historyHref: "/current?view=compact#top",
      },
    },
  ])("classifies $name as internal navigation", ({ href, expected }) => {
    expect(classifyNavigation(href, CURRENT_URL)).toEqual(expected);
  });

  it.each([
    { name: "fragment", href: "#section" },
    { name: "space-prefixed fragment", href: " #section" },
    { name: "tab-prefixed fragment", href: "\t#section" },
    { name: "space-prefixed empty fragment", href: " #" },
    {
      name: "absolute same-document fragment",
      href: "https://example.test/current?old=1#section",
    },
    {
      name: "absolute same-document empty fragment",
      href: "https://example.test/current?old=1#",
    },
    { name: "external HTTPS URL", href: "https://outside.test/page" },
    { name: "external HTTP URL", href: "http://example.test/page" },
    { name: "external protocol-relative URL", href: "//outside.test/page" },
    { name: "mailto URL", href: "mailto:user@example.test" },
    { name: "tel URL", href: "tel:+81000000000" },
    { name: "FTP URL", href: "ftp://example.test/file" },
    { name: "malformed URL", href: "http://[" },
  ])("leaves $name to the browser", ({ href }) => {
    expect(classifyNavigation(href, CURRENT_URL)).toEqual({ kind: "browser" });
  });

  it("treats same-origin HTTP as internal when the current page is HTTP", () => {
    expect(classifyNavigation("http://example.test/page", "http://example.test/current")).toEqual({
      kind: "internal",
      pagePath: "page",
      historyHref: "/page",
    });
  });

  it("keeps a double-slash pathname same-origin in history", () => {
    expect(classifyNavigation("https://example.test//outside.test/path", CURRENT_URL)).toEqual({
      kind: "internal",
      pagePath: "outside.test/path",
      historyHref: "/outside.test/path",
    });
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("blocks dangerous URL %s", (href) => {
    expect(classifyNavigation(href, CURRENT_URL)).toEqual({ kind: "blocked" });
  });
});
