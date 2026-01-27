import { describe, it, expect } from "bun:test";
import { compileListUsersTemplate } from "../../../../packages/parser/src/parser/rules/block/module/listusers/compiler";
import type { ListUsersVariableContext } from "../../../../packages/parser/src/parser/rules/block/module/listusers/types";

function createContext(
  overrides: Partial<ListUsersVariableContext["user"]> = {},
): ListUsersVariableContext {
  return {
    user: {
      number: 12345,
      title: "TestUser",
      name: "testuser",
      ...overrides,
    },
  };
}

describe("compileListUsersTemplate", () => {
  describe("static templates", () => {
    it("returns static text as-is", () => {
      const template = compileListUsersTemplate("Hello World");
      expect(template(createContext())).toBe("Hello World");
    });

    it("returns empty string for empty template", () => {
      const template = compileListUsersTemplate("");
      expect(template(createContext())).toBe("");
    });
  });

  describe("%%number%%", () => {
    it("substitutes user number", () => {
      const template = compileListUsersTemplate("User #%%number%%");
      expect(template(createContext())).toBe("User #12345");
    });

    it("handles zero", () => {
      const template = compileListUsersTemplate("%%number%%");
      expect(template(createContext({ number: 0 }))).toBe("0");
    });
  });

  describe("%%title%%", () => {
    it("substitutes user title", () => {
      const template = compileListUsersTemplate("Hello %%title%%!");
      expect(template(createContext())).toBe("Hello TestUser!");
    });

    it("handles empty title", () => {
      const template = compileListUsersTemplate("%%title%%");
      expect(template(createContext({ title: "" }))).toBe("");
    });
  });

  describe("%%name%%", () => {
    it("substitutes user name", () => {
      const template = compileListUsersTemplate("%%name%%");
      expect(template(createContext())).toBe("testuser");
    });
  });

  describe("multiple variables", () => {
    it("substitutes all variables", () => {
      const template = compileListUsersTemplate("%%title%% (%%name%%) #%%number%%");
      expect(template(createContext())).toBe("TestUser (testuser) #12345");
    });

    it("handles repeated variables", () => {
      const template = compileListUsersTemplate("%%name%% %%name%%");
      expect(template(createContext())).toBe("testuser testuser");
    });
  });

  describe("unknown variables", () => {
    it("replaces unknown variables with empty string", () => {
      const template = compileListUsersTemplate("%%unknown%% and %%title%%");
      expect(template(createContext())).toBe(" and TestUser");
    });
  });

  describe("case insensitivity", () => {
    it("handles uppercase variable names", () => {
      const template = compileListUsersTemplate("%%TITLE%% %%Name%%");
      expect(template(createContext())).toBe("TestUser testuser");
    });
  });
});
