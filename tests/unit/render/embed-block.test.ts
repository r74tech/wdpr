import { test, expect, describe } from "bun:test";
import {
  renderEmbedBlock,
  type EmbedAllowlistEntry,
} from "../../../packages/render/src/elements/embed-block";
import type { RenderContext } from "../../../packages/render/src/context";

// Mock RenderContext
function createMockContext(options: any = {}): RenderContext {
  const output: string[] = [];
  return {
    push: (s: string) => output.push(s),
    getOutput: () => output.join(""),
    options,
  } as any;
}

describe("embed-block security", () => {
  describe("allowed hosts with correct paths", () => {
    test("YouTube embed with /embed/ path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents:
          '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>',
      };
      renderEmbedBlock(ctx, data);
      const output = ctx.getOutput();
      expect(output).toContain("youtube.com/embed");
      expect(output).not.toContain("error-block");
    });

    test("YouTube-nocookie embed with /embed/ path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Vimeo embed with /video/ path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://player.vimeo.com/video/123456789"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Google Maps embed with /maps/embed path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.google.com/maps/embed?pb=xyz"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Google Calendar embed with /calendar/embed path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://calendar.google.com/calendar/embed?src=abc"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Spotify embed with /embed/ path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://open.spotify.com/embed/track/123"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("SoundCloud embed with /player/ path is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://w.soundcloud.com/player/?url=xyz"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("CodePen embed is allowed (no path restriction)", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://codepen.io/user/embed/pen123"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });
  });

  describe("path validation (blocked wrong paths)", () => {
    test("YouTube without /embed/ path is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Vimeo without /video/ path is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://player.vimeo.com/channels/123"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Google without /maps/embed path is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.google.com/search?q=test"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Spotify without /embed/ path is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://open.spotify.com/track/123"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Path prefix boundary - /maps/embedX is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.google.com/maps/embedXmalicious"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Path prefix boundary - /maps/embed?query is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.google.com/maps/embed?pb=xyz"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Path prefix boundary - /maps/embed/subpath is allowed", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://www.google.com/maps/embed/v1/place"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });
  });

  describe("blocked content", () => {
    test("HTTP iframe is allowed for allowlisted host", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="http://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Unknown host is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="https://evil.example.com/malware"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("javascript: URL is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe src="javascript:alert(1)"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("No iframe is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: "<script>alert(1)</script>",
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("iframe without src is blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Multiple iframes are blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents:
          '<iframe src="https://www.youtube.com/embed/abc"></iframe><iframe src="https://evil.com/xss"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Multiple iframes with same allowed host are blocked", () => {
      const ctx = createMockContext();
      const data = {
        contents:
          '<iframe src="https://www.youtube.com/embed/abc"></iframe><iframe src="https://www.youtube.com/embed/def"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });
  });

  describe("anyiframe mode (null allowlist)", () => {
    test("Any HTTPS iframe is allowed when allowlist is null", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="https://any-site.example.com/embed"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("HTTP is allowed when allowlist is null", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="http://any-site.example.com/embed"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Multiple iframes are still blocked when allowlist is null", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="https://a.com/"></iframe><iframe src="https://b.com/"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });
  });

  describe("protocol-relative URLs", () => {
    test("protocol-relative URL is resolved with HTTPS baseUrl", () => {
      const ctx = createMockContext({
        embedAllowlist: null,
        baseUrl: "https://scp-wiki.wikidot.com",
      });
      const data = {
        contents: '<iframe src="//interwiki.scp-jp.org/interwikiFrame.html"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("protocol-relative URL is resolved with HTTP baseUrl", () => {
      const ctx = createMockContext({ embedAllowlist: null, baseUrl: "http://scp-jp.wikidot.com" });
      const data = {
        contents: '<iframe src="//interwiki.scp-jp.org/interwikiFrame.html"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("protocol-relative URL defaults to HTTPS when baseUrl is not provided", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="//interwiki.scp-jp.org/interwikiFrame.html"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("protocol-relative URL is checked against allowlist", () => {
      const ctx = createMockContext({ baseUrl: "https://example.com" });
      const data = {
        contents: '<iframe src="//unknown-host.example.com/page"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("protocol-relative URL with allowlisted host is allowed", () => {
      const allowlist = [{ host: "*.youtube.com", pathPrefix: "/embed/" }];
      const ctx = createMockContext({ embedAllowlist: allowlist, baseUrl: "https://example.com" });
      const data = {
        contents: '<iframe src="//www.youtube.com/embed/abc123"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });
  });

  describe("ReDoS resistance", () => {
    test("Malicious input with many spaces does not hang", () => {
      const ctx = createMockContext();
      const maliciousSpaces = "<iframe" + " ".repeat(100);
      const data = {
        contents: maliciousSpaces,
      };

      const start = performance.now();
      renderEmbedBlock(ctx, data);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Malicious input with repeated src attributes does not hang", () => {
      const ctx = createMockContext();
      const maliciousSrc =
        '<iframe src="https://youtube.com/embed/-"' +
        ' src="https://youtube.com/embed/-"'.repeat(20);
      const data = {
        contents: maliciousSrc,
      };

      const start = performance.now();
      renderEmbedBlock(ctx, data);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe("iframe attributes preservation", () => {
    test("style attribute is preserved on iframe", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="https://example.com/frame.html" style="display: none"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      const output = ctx.getOutput();
      expect(output).not.toContain("error-block");
      expect(output).toMatch(/style="display:\s*none"/);
    });

    test("class attribute is preserved on iframe", () => {
      const ctx = createMockContext({ embedAllowlist: null });
      const data = {
        contents: '<iframe src="https://example.com/frame.html" class="my-iframe"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      const output = ctx.getOutput();
      expect(output).not.toContain("error-block");
      expect(output).toContain('class="my-iframe"');
    });
  });

  describe("custom allowlist", () => {
    test("Custom allowlist with host only", () => {
      const allowlist: EmbedAllowlistEntry[] = [{ host: "example.com" }];
      const ctx = createMockContext({ embedAllowlist: allowlist });
      const data = {
        contents: '<iframe src="https://example.com/any/path"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Custom allowlist with host and path - correct path allowed", () => {
      const allowlist: EmbedAllowlistEntry[] = [{ host: "example.com", pathPrefix: "/embed/" }];
      const ctx = createMockContext({ embedAllowlist: allowlist });
      renderEmbedBlock(ctx, {
        contents: '<iframe src="https://example.com/embed/video"></iframe>',
      });
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("Custom allowlist with host and path - wrong path blocked", () => {
      const allowlist: EmbedAllowlistEntry[] = [{ host: "example.com", pathPrefix: "/embed/" }];
      const ctx = createMockContext({ embedAllowlist: allowlist });
      renderEmbedBlock(ctx, {
        contents: '<iframe src="https://example.com/other/path"></iframe>',
      });
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Custom allowlist with wildcard host", () => {
      const allowlist: EmbedAllowlistEntry[] = [{ host: "*.example.com" }];
      const ctx = createMockContext({ embedAllowlist: allowlist });
      const data = {
        contents: '<iframe src="https://sub.example.com/video"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).not.toContain("error-block");
    });

    test("YouTube is blocked with custom allowlist not including it", () => {
      const allowlist: EmbedAllowlistEntry[] = [{ host: "example.com" }];
      const ctx = createMockContext({ embedAllowlist: allowlist });
      const data = {
        contents: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });

    test("Empty allowlist blocks all embeds", () => {
      const ctx = createMockContext({ embedAllowlist: [] });
      const data = {
        contents: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
      };
      renderEmbedBlock(ctx, data);
      expect(ctx.getOutput()).toContain("error-block");
    });
  });
});
