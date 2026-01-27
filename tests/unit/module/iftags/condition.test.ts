import { describe, test, expect } from "bun:test";
import {
  parseTagCondition,
  evaluateTagCondition,
} from "../../../../packages/parser/src/parser/rules/block/module/iftags";

describe("parseTagCondition", () => {
  test("parses required tags without prefix", () => {
    const result = parseTagCondition("fruit vegetable");
    expect(result.required).toEqual(["fruit", "vegetable"]);
    expect(result.forbidden).toEqual([]);
  });

  test("parses required tags with + prefix", () => {
    const result = parseTagCondition("+fruit +vegetable");
    expect(result.required).toEqual(["fruit", "vegetable"]);
    expect(result.forbidden).toEqual([]);
  });

  test("parses forbidden tags with - prefix", () => {
    const result = parseTagCondition("-admin -hidden");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual(["admin", "hidden"]);
  });

  test("parses mixed conditions", () => {
    const result = parseTagCondition("+fruit -admin component");
    expect(result.required).toEqual(["fruit", "component"]);
    expect(result.forbidden).toEqual(["admin"]);
  });

  test("handles extra whitespace", () => {
    const result = parseTagCondition("  +fruit   -admin   component  ");
    expect(result.required).toEqual(["fruit", "component"]);
    expect(result.forbidden).toEqual(["admin"]);
  });

  test("ignores standalone + prefix (empty tag name)", () => {
    const result = parseTagCondition("+ +fruit");
    expect(result.required).toEqual(["fruit"]);
    expect(result.forbidden).toEqual([]);
  });

  test("ignores standalone - prefix (empty tag name)", () => {
    const result = parseTagCondition("- -admin");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual(["admin"]);
  });

  test("handles empty string", () => {
    const result = parseTagCondition("");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual([]);
  });

  test("handles whitespace only", () => {
    const result = parseTagCondition("   ");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual([]);
  });
});

describe("evaluateTagCondition", () => {
  test("matches when all required tags present", () => {
    const condition = { required: ["fruit", "red"], forbidden: [] };
    expect(evaluateTagCondition(condition, ["fruit", "red", "apple"])).toBe(true);
  });

  test("fails when required tag missing", () => {
    const condition = { required: ["fruit", "red"], forbidden: [] };
    expect(evaluateTagCondition(condition, ["fruit", "green"])).toBe(false);
  });

  test("fails when forbidden tag present", () => {
    const condition = { required: ["fruit"], forbidden: ["admin"] };
    expect(evaluateTagCondition(condition, ["fruit", "admin"])).toBe(false);
  });

  test("passes when forbidden tag absent", () => {
    const condition = { required: ["fruit"], forbidden: ["admin"] };
    expect(evaluateTagCondition(condition, ["fruit", "public"])).toBe(true);
  });

  test("matches empty condition with any tags", () => {
    const condition = { required: [], forbidden: [] };
    expect(evaluateTagCondition(condition, ["any", "tags"])).toBe(true);
  });

  test("matches empty condition with empty tags", () => {
    const condition = { required: [], forbidden: [] };
    expect(evaluateTagCondition(condition, [])).toBe(true);
  });
});
