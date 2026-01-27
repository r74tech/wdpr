import { describe, expect, it } from "bun:test";
import { extractDataRequirements } from "../../../../packages/parser/src/parser/rules/block/module/listpages/extract";
import type { SyntaxTree, Module, Element } from "@wdpr/ast";

/**
 * Type alias for list-pages module
 */
type ListPagesModule = Extract<Module, { module: "list-pages" }>;

/**
 * Helper to create a ListPages module element
 */
function createListPagesModule(
  content: Partial<Omit<ListPagesModule, "module">>,
  body?: string,
): Element {
  return {
    element: "module",
    data: {
      module: "list-pages",
      body: body ?? "",
      reverse: false,
      separate: false,
      wrapper: true,
      "rss-only": false,
      attributes: {},
      ...content,
    } as ListPagesModule,
  };
}

/**
 * Helper to create a SyntaxTree with modules
 */
function createSyntaxTree(elements: Element[]): SyntaxTree {
  return {
    elements,
  };
}

describe("extractDataRequirements", () => {
  describe("basic extraction", () => {
    it("should extract empty requirements from empty document", () => {
      const doc = createSyntaxTree([]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages).toEqual([]);
      expect(result.compiledListPagesTemplates.size).toBe(0);
    });

    it("should extract single ListPages module", () => {
      const doc = createSyntaxTree([
        createListPagesModule({ category: "blog" }, "%%title%% by %%created_by%%"),
      ]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages.length).toBe(1);
      expect(result.compiledListPagesTemplates.size).toBe(1);
    });

    it("should extract multiple ListPages modules with unique IDs", () => {
      const doc = createSyntaxTree([
        createListPagesModule({ category: "blog" }, "%%title%%"),
        createListPagesModule({ category: "news" }, "%%fullname%%"),
      ]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages.length).toBe(2);
      expect(result.requirements.listPages[0]?.id).toBe(0);
      expect(result.requirements.listPages[1]?.id).toBe(1);
    });
  });

  describe("query extraction", () => {
    it("should extract category filter", () => {
      const doc = createSyntaxTree([createListPagesModule({ category: "scp" }, "%%title%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.query.category).toBe("scp");
    });

    it("should extract tags filter", () => {
      const doc = createSyntaxTree([createListPagesModule({ tags: "+safe -joke" }, "%%title%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.query.tags).toBe("+safe -joke");
    });

    it("should extract parent filter", () => {
      const doc = createSyntaxTree([createListPagesModule({ parent: "scp-001" }, "%%title%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.query.parent).toBe("scp-001");
    });

    it("should extract limit and offset", () => {
      const doc = createSyntaxTree([createListPagesModule({ limit: 10, offset: 5 }, "%%title%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.query.limit).toBe(10);
      expect(result.requirements.listPages[0]?.query.offset).toBe(5);
    });

    it("should extract order", () => {
      const doc = createSyntaxTree([createListPagesModule({ order: "rating desc" }, "%%title%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.query.order).toBe("rating desc");
    });
  });

  describe("variable extraction", () => {
    it("should extract basic variables", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%title%% %%rating%% %%created_by%%"),
      ]);
      const result = extractDataRequirements(doc);
      const vars = result.requirements.listPages[0]?.neededVariables ?? [];
      expect(vars).toContain("title");
      expect(vars).toContain("rating");
      expect(vars).toContain("created_by");
    });

    it("should extract date variables", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%created_at%% %%updated_at%%")]);
      const result = extractDataRequirements(doc);
      const vars = result.requirements.listPages[0]?.neededVariables ?? [];
      expect(vars).toContain("created_at");
      expect(vars).toContain("updated_at");
    });

    it("should extract tags variables", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%tags%% %%_tags%% %%tags_linked%%"),
      ]);
      const result = extractDataRequirements(doc);
      const vars = result.requirements.listPages[0]?.neededVariables ?? [];
      expect(vars).toContain("tags");
      expect(vars).toContain("_tags");
      expect(vars).toContain("tags_linked");
    });

    it("should deduplicate variables", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%% %%title%% %%title%%")]);
      const result = extractDataRequirements(doc);
      const vars = result.requirements.listPages[0]?.neededVariables ?? [];
      expect(vars.filter((v) => v === "title").length).toBe(1);
    });
  });

  describe("content section extraction", () => {
    it("should extract content section indices", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%content{1}%% and %%content{3}%%"),
      ]);
      const result = extractDataRequirements(doc);
      const indices = result.requirements.listPages[0]?.contentSectionIndices ?? [];
      expect(indices).toContain(1);
      expect(indices).toContain(3);
    });

    it("should sort content section indices", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%content{3}%% %%content{1}%% %%content{2}%%"),
      ]);
      const result = extractDataRequirements(doc);
      const indices = result.requirements.listPages[0]?.contentSectionIndices ?? [];
      expect(indices).toEqual([1, 2, 3]);
    });
  });

  describe("preview length extraction", () => {
    it("should extract preview lengths", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%preview(100)%% %%preview(50)%%")]);
      const result = extractDataRequirements(doc);
      const lengths = result.requirements.listPages[0]?.previewLengths ?? [];
      expect(lengths).toContain(50);
      expect(lengths).toContain(100);
    });

    it("should sort preview lengths", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%preview(300)%% %%preview(100)%%"),
      ]);
      const result = extractDataRequirements(doc);
      const lengths = result.requirements.listPages[0]?.previewLengths ?? [];
      expect(lengths).toEqual([100, 300]);
    });
  });

  describe("form field extraction", () => {
    it("should extract form_data fields", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%form_data{author}%% %%form_data{title}%%"),
      ]);
      const result = extractDataRequirements(doc);
      const fields = result.requirements.listPages[0]?.formFields ?? [];
      expect(fields).toContain("author");
      expect(fields).toContain("title");
    });

    it("should extract form_raw fields", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%form_raw{content}%%")]);
      const result = extractDataRequirements(doc);
      const fields = result.requirements.listPages[0]?.formFields ?? [];
      expect(fields).toContain("content");
    });

    it("should sort form fields", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%form_data{z}%% %%form_data{a}%%"),
      ]);
      const result = extractDataRequirements(doc);
      const fields = result.requirements.listPages[0]?.formFields ?? [];
      expect(fields).toEqual(["a", "z"]);
    });
  });

  describe("tags link prefix extraction", () => {
    it("should extract tags_linked prefix", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%tags_linked|/custom/tag/%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.tagsLinkPrefix).toBe("/custom/tag/");
    });

    it("should extract _tags_linked prefix", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%_tags_linked|/hidden/%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.hiddenTagsLinkPrefix).toBe("/hidden/");
    });

    it("should not set prefix when not specified", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%tags_linked%%")]);
      const result = extractDataRequirements(doc);
      expect(result.requirements.listPages[0]?.tagsLinkPrefix).toBeUndefined();
    });
  });

  describe("compiled templates", () => {
    it("should provide compiledListPagesTemplates for each module", () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%title%%"),
        createListPagesModule({}, "%%fullname%%"),
      ]);
      const result = extractDataRequirements(doc);
      expect(result.compiledListPagesTemplates.has(0)).toBe(true);
      expect(result.compiledListPagesTemplates.has(1)).toBe(true);
    });

    it("should create executable template functions", () => {
      const doc = createSyntaxTree([createListPagesModule({}, "Title: %%title%%")]);
      const result = extractDataRequirements(doc);
      const template = result.compiledListPagesTemplates.get(0);
      expect(template).toBeDefined();

      const ctx = {
        page: {
          name: "test",
          category: "_default",
          fullname: "test",
          title: "Test Title",
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          hiddenTags: [],
          children: 0,
          comments: 0,
          size: 0,
          rating: 0,
          ratingVotes: 0,
          revisions: 0,
        },
        index: 1,
        total: 1,
        site: { name: "test", title: "Test", domain: "test.com" },
      };

      expect(template!(ctx)).toBe("Title: Test Title");
    });
  });
});
