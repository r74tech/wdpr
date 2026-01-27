import { describe, expect, it } from "bun:test";
import { compileTemplate } from "../../../../packages/parser/src/parser/rules/block/module/listpages/compiler";
import type {
  VariableContext,
  PageData,
} from "../../../../packages/parser/src/parser/rules/block/module/listpages/types";

/**
 * Helper to create a minimal page
 */
function createPage(overrides: Partial<PageData> = {}): PageData {
  return {
    name: "test-page",
    category: "_default",
    fullname: "test-page",
    title: "Test Page",
    createdAt: new Date("2024-01-15T12:00:00Z"),
    createdBy: { id: 1, name: "TestUser", unixName: "test-user" },
    updatedAt: new Date("2024-01-20T15:30:00Z"),
    updatedBy: { id: 2, name: "Editor", unixName: "editor" },
    tags: ["tag1", "tag2"],
    hiddenTags: ["_hidden"],
    children: 5,
    comments: 10,
    size: 1500,
    rating: 42,
    ratingVotes: 50,
    revisions: 3,
    ...overrides,
  };
}

/**
 * Helper to create a context
 */
function createContext(
  pageOverrides: Partial<PageData> = {},
  contextOverrides: Partial<VariableContext> = {},
): VariableContext {
  return {
    page: createPage(pageOverrides),
    index: 1,
    total: 10,
    site: {
      name: "test-site",
      title: "Test Site",
      domain: "test.wikidot.com",
    },
    ...contextOverrides,
  };
}

describe("compileTemplate", () => {
  describe("static templates", () => {
    it("should return static text as-is", () => {
      const fn = compileTemplate("Hello, World!");
      const ctx = createContext();
      expect(fn(ctx)).toBe("Hello, World!");
    });

    it("should handle empty template", () => {
      const fn = compileTemplate("");
      const ctx = createContext();
      expect(fn(ctx)).toBe("");
    });
  });

  describe("basic variables", () => {
    it("should substitute %%title%%", () => {
      const fn = compileTemplate("Title: %%title%%");
      const ctx = createContext({ title: "My Page" });
      expect(fn(ctx)).toBe("Title: My Page");
    });

    it("should substitute %%name%%", () => {
      const fn = compileTemplate("%%name%%");
      const ctx = createContext({ name: "page-name" });
      expect(fn(ctx)).toBe("page-name");
    });

    it("should substitute %%fullname%%", () => {
      const fn = compileTemplate("%%fullname%%");
      const ctx = createContext({ fullname: "category:page" });
      expect(fn(ctx)).toBe("category:page");
    });

    it("should substitute %%category%%", () => {
      const fn = compileTemplate("%%category%%");
      const ctx = createContext({ category: "blog" });
      expect(fn(ctx)).toBe("blog");
    });
  });

  describe("lifecycle variables", () => {
    it("should substitute %%created_by%%", () => {
      const fn = compileTemplate("By: %%created_by%%");
      const ctx = createContext({
        createdBy: { id: 1, name: "Alice", unixName: "alice" },
      });
      expect(fn(ctx)).toBe("By: Alice");
    });

    it("should substitute %%created_by_linked%%", () => {
      const fn = compileTemplate("%%created_by_linked%%");
      const ctx = createContext({
        createdBy: { id: 1, name: "Alice", unixName: "alice" },
      });
      expect(fn(ctx)).toBe("[[*user Alice]]");
    });

    it("should substitute %%updated_by%%", () => {
      const fn = compileTemplate("%%updated_by%%");
      const ctx = createContext({
        updatedBy: { id: 2, name: "Bob", unixName: "bob" },
      });
      expect(fn(ctx)).toBe("Bob");
    });

    it("should handle missing commented_by", () => {
      const fn = compileTemplate("%%commented_by%%");
      const ctx = createContext({ commentedBy: undefined });
      expect(fn(ctx)).toBe("");
    });
  });

  describe("date variables with format", () => {
    it("should format %%created_at%% with default ISO", () => {
      const fn = compileTemplate("%%created_at%%");
      const ctx = createContext({
        createdAt: new Date("2024-06-15T10:30:00Z"),
      });
      expect(fn(ctx)).toBe("2024-06-15T10:30:00.000Z");
    });

    it("should format %%created_at|%Y-%m-%d%%", () => {
      const fn = compileTemplate("%%created_at|%Y-%m-%d%%");
      const ctx = createContext({
        createdAt: new Date("2024-06-15T10:30:00Z"),
      });
      expect(fn(ctx)).toBe("2024-06-15");
    });

    it("should format %%updated_at|%B %d, %Y%%", () => {
      const fn = compileTemplate("%%updated_at|%B %d, %Y%%");
      const ctx = createContext({
        updatedAt: new Date("2024-06-15T10:30:00Z"),
      });
      expect(fn(ctx)).toBe("June 15, 2024");
    });
  });

  describe("metrics variables", () => {
    it("should substitute %%rating%%", () => {
      const fn = compileTemplate("Rating: %%rating%%");
      const ctx = createContext({ rating: 100 });
      expect(fn(ctx)).toBe("Rating: 100");
    });

    it("should substitute %%comments%%", () => {
      const fn = compileTemplate("%%comments%% comments");
      const ctx = createContext({ comments: 25 });
      expect(fn(ctx)).toBe("25 comments");
    });

    it("should substitute %%revisions%%", () => {
      const fn = compileTemplate("%%revisions%%");
      const ctx = createContext({ revisions: 15 });
      expect(fn(ctx)).toBe("15");
    });
  });

  describe("tags variables", () => {
    it("should substitute %%tags%%", () => {
      const fn = compileTemplate("%%tags%%");
      const ctx = createContext({ tags: ["scp", "safe", "joke"] });
      expect(fn(ctx)).toBe("scp safe joke");
    });

    it("should substitute %%_tags%%", () => {
      const fn = compileTemplate("%%_tags%%");
      const ctx = createContext({ hiddenTags: ["_hidden1", "_hidden2"] });
      expect(fn(ctx)).toBe("_hidden1 _hidden2");
    });

    it("should substitute %%tags_linked%%", () => {
      const fn = compileTemplate("%%tags_linked%%");
      const ctx = createContext({ tags: ["tag1", "tag2"] });
      expect(fn(ctx)).toBe("[/system:page-tags/tag/tag1 tag1] [/system:page-tags/tag/tag2 tag2]");
    });

    it("should use custom prefix for %%tags_linked|/custom/%%", () => {
      const fn = compileTemplate("%%tags_linked|/custom/%%");
      const ctx = createContext({ tags: ["foo"] });
      expect(fn(ctx)).toBe("[/custom/foo foo]");
    });
  });

  describe("pagination variables", () => {
    it("should substitute %%index%%", () => {
      const fn = compileTemplate("%%index%%");
      const ctx = createContext({}, { index: 5 });
      expect(fn(ctx)).toBe("5");
    });

    it("should substitute %%total%%", () => {
      const fn = compileTemplate("%%total%%");
      const ctx = createContext({}, { total: 100 });
      expect(fn(ctx)).toBe("100");
    });

    it("should substitute %%limit%% when set", () => {
      const fn = compileTemplate("%%limit%%");
      const ctx = createContext({}, { limit: 20 });
      expect(fn(ctx)).toBe("20");
    });

    it("should substitute %%limit%% as empty when not set", () => {
      const fn = compileTemplate("%%limit%%");
      const ctx = createContext({}, { limit: undefined });
      expect(fn(ctx)).toBe("");
    });

    it("should substitute %%total_or_limit%%", () => {
      const fn = compileTemplate("%%total_or_limit%%");
      const ctx = createContext({}, { total: 100, limit: 20 });
      expect(fn(ctx)).toBe("20");
    });
  });

  describe("content variables", () => {
    it("should substitute %%content%%", () => {
      const fn = compileTemplate("%%content%%");
      const ctx = createContext({ content: "Full page content here." });
      expect(fn(ctx)).toBe("Full page content here.");
    });

    it("should substitute %%preview%%", () => {
      const fn = compileTemplate("%%preview%%");
      const content = "A".repeat(300);
      const ctx = createContext({ content });
      expect(fn(ctx)).toBe("A".repeat(200));
    });

    it("should substitute %%preview(50)%%", () => {
      const fn = compileTemplate("%%preview(50)%%");
      const content = "B".repeat(100);
      const ctx = createContext({ content });
      expect(fn(ctx)).toBe("B".repeat(50));
    });

    it("should substitute %%content{1}%%", () => {
      const fn = compileTemplate("%%content{1}%%");
      const ctx = createContext({
        // ==== separates sections, %%content{n}%% is 1-indexed
        content: "Section one\n====\nSection two",
      });
      expect(fn(ctx)).toBe("Section one");
    });

    it("should substitute %%content{2}%%", () => {
      const fn = compileTemplate("%%content{2}%%");
      const ctx = createContext({
        content: "Section one\n====\nSection two",
      });
      expect(fn(ctx)).toBe("Section two");
    });
  });

  describe("site variables", () => {
    it("should substitute %%site_name%%", () => {
      const fn = compileTemplate("%%site_name%%");
      const ctx = createContext();
      ctx.site = { name: "mysite", title: "My Site", domain: "mysite.com" };
      expect(fn(ctx)).toBe("mysite");
    });

    it("should substitute %%site_title%%", () => {
      const fn = compileTemplate("%%site_title%%");
      const ctx = createContext();
      ctx.site = {
        name: "mysite",
        title: "My Awesome Site",
        domain: "mysite.com",
      };
      expect(fn(ctx)).toBe("My Awesome Site");
    });

    it("should substitute %%site_domain%%", () => {
      const fn = compileTemplate("%%site_domain%%");
      const ctx = createContext();
      ctx.site = { name: "test", title: "Test", domain: "test.wikidot.com" };
      expect(fn(ctx)).toBe("test.wikidot.com");
    });
  });

  describe("link variable", () => {
    it("should generate full URL for %%link%%", () => {
      const fn = compileTemplate("%%link%%");
      const ctx = createContext({ fullname: "blog:my-post" });
      ctx.site = { name: "test", title: "Test", domain: "test.wikidot.com" };
      expect(fn(ctx)).toBe("https://test.wikidot.com/blog:my-post");
    });
  });

  describe("title_linked variable", () => {
    it("should generate linked title", () => {
      const fn = compileTemplate("%%title_linked%%");
      const ctx = createContext({ fullname: "my-page", title: "My Page" });
      expect(fn(ctx)).toBe("[[[my-page | My Page]]]");
    });
  });

  describe("parent variables", () => {
    it("should substitute %%parent_fullname%%", () => {
      const fn = compileTemplate("%%parent_fullname%%");
      const ctx = createContext({ parentFullname: "parent-page" });
      expect(fn(ctx)).toBe("parent-page");
    });

    it("should handle missing parent", () => {
      const fn = compileTemplate("%%parent_fullname%%");
      const ctx = createContext({ parentFullname: undefined });
      expect(fn(ctx)).toBe("");
    });

    it("should generate %%parent_title_linked%% when parent exists", () => {
      const fn = compileTemplate("%%parent_title_linked%%");
      const ctx = createContext({
        parentFullname: "parent",
        parentTitle: "Parent Page",
      });
      expect(fn(ctx)).toBe("[[[parent | Parent Page]]]");
    });

    it("should return empty for %%parent_title_linked%% when no parent", () => {
      const fn = compileTemplate("%%parent_title_linked%%");
      const ctx = createContext({ parentFullname: undefined });
      expect(fn(ctx)).toBe("");
    });
  });

  describe("form variables", () => {
    it("should substitute %%form_data{field}%%", () => {
      const fn = compileTemplate("%%form_data{author}%%");
      const ctx = createContext({ formData: { author: "John Doe" } });
      expect(fn(ctx)).toBe("John Doe");
    });

    it("should return empty for missing form field", () => {
      const fn = compileTemplate("%%form_data{missing}%%");
      const ctx = createContext({ formData: { other: "value" } });
      expect(fn(ctx)).toBe("");
    });

    it("should substitute %%form_raw{field}%%", () => {
      const fn = compileTemplate("%%form_raw{content}%%");
      const ctx = createContext({ formRaw: { content: "**raw** text" } });
      expect(fn(ctx)).toBe("**raw** text");
    });
  });

  describe("unknown variables", () => {
    it("should return empty string for unknown variables", () => {
      const fn = compileTemplate("%%unknown_var%%");
      const ctx = createContext();
      expect(fn(ctx)).toBe("");
    });
  });

  describe("ReDoS resistance", () => {
    it("should handle malicious input without exponential backtracking", () => {
      // Malicious input: long string with | but no closing %%
      const maliciousInput = "%%variable|" + "a".repeat(10000);

      const start = performance.now();
      const fn = compileTemplate(maliciousInput);
      const result = fn(createContext());
      const elapsed = performance.now() - start;

      // Should complete in under 1000ms (exponential backtracking would take seconds/minutes)
      // Using generous threshold to avoid flaky tests on slow CI environments
      expect(elapsed).toBeLessThan(1000);
      // Should return the input as-is since variable is not properly closed
      expect(result).toBe(maliciousInput);
    });

    it("should handle nested pipe characters", () => {
      const input = "%%variable|a|b|c|d|e%%";

      const start = performance.now();
      const fn = compileTemplate(input);
      fn(createContext());
      const elapsed = performance.now() - start;

      // Generous threshold for CI stability
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe("mixed templates", () => {
    it("should handle multiple variables", () => {
      const fn = compileTemplate("%%title%% by %%created_by%% (%%rating%%)");
      const ctx = createContext({
        title: "Article",
        createdBy: { id: 1, name: "Writer", unixName: "writer" },
        rating: 50,
      });
      expect(fn(ctx)).toBe("Article by Writer (50)");
    });

    it("should handle case insensitivity", () => {
      const fn = compileTemplate("%%TITLE%% %%Title%% %%title%%");
      const ctx = createContext({ title: "Test" });
      expect(fn(ctx)).toBe("Test Test Test");
    });
  });
});
