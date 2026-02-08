import { describe, test, expect } from "bun:test";
import {
  parseTagCondition,
  evaluateTagCondition,
} from "../../../../packages/parser/src/parser/rules/block/module/iftags";

describe("parseTagCondition", () => {
  test("parses bare tags as optional", () => {
    const result = parseTagCondition("fruit vegetable");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual([]);
    expect(result.optional).toEqual(["fruit", "vegetable"]);
  });

  test("parses required tags with + prefix", () => {
    const result = parseTagCondition("+fruit +vegetable");
    expect(result.required).toEqual(["fruit", "vegetable"]);
    expect(result.forbidden).toEqual([]);
    expect(result.optional).toEqual([]);
  });

  test("parses forbidden tags with - prefix", () => {
    const result = parseTagCondition("-admin -hidden");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual(["admin", "hidden"]);
    expect(result.optional).toEqual([]);
  });

  test("parses mixed conditions", () => {
    const result = parseTagCondition("+fruit -admin component");
    expect(result.required).toEqual(["fruit"]);
    expect(result.forbidden).toEqual(["admin"]);
    expect(result.optional).toEqual(["component"]);
  });

  test("handles extra whitespace", () => {
    const result = parseTagCondition("  +fruit   -admin   component  ");
    expect(result.required).toEqual(["fruit"]);
    expect(result.forbidden).toEqual(["admin"]);
    expect(result.optional).toEqual(["component"]);
  });

  test("ignores standalone + prefix (empty tag name)", () => {
    const result = parseTagCondition("+ +fruit");
    expect(result.required).toEqual(["fruit"]);
    expect(result.forbidden).toEqual([]);
    expect(result.optional).toEqual([]);
  });

  test("ignores standalone - prefix (empty tag name)", () => {
    const result = parseTagCondition("- -admin");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual(["admin"]);
    expect(result.optional).toEqual([]);
  });

  test("handles empty string", () => {
    const result = parseTagCondition("");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual([]);
    expect(result.optional).toEqual([]);
  });

  test("handles whitespace only", () => {
    const result = parseTagCondition("   ");
    expect(result.required).toEqual([]);
    expect(result.forbidden).toEqual([]);
    expect(result.optional).toEqual([]);
  });
});

describe("evaluateTagCondition", () => {
  test("matches when all required tags present", () => {
    const condition = { required: ["fruit", "red"], forbidden: [], optional: [] };
    expect(evaluateTagCondition(condition, ["fruit", "red", "apple"])).toBe(true);
  });

  test("fails when required tag missing", () => {
    const condition = { required: ["fruit", "red"], forbidden: [], optional: [] };
    expect(evaluateTagCondition(condition, ["fruit", "green"])).toBe(false);
  });

  test("fails when forbidden tag present", () => {
    const condition = { required: ["fruit"], forbidden: ["admin"], optional: [] };
    expect(evaluateTagCondition(condition, ["fruit", "admin"])).toBe(false);
  });

  test("passes when forbidden tag absent", () => {
    const condition = { required: ["fruit"], forbidden: ["admin"], optional: [] };
    expect(evaluateTagCondition(condition, ["fruit", "public"])).toBe(true);
  });

  test("empty condition never matches (supercommentout)", () => {
    const condition = { required: [], forbidden: [], optional: [] };
    expect(evaluateTagCondition(condition, ["any", "tags"])).toBe(false);
  });

  test("empty condition never matches even with empty tags", () => {
    const condition = { required: [], forbidden: [], optional: [] };
    expect(evaluateTagCondition(condition, [])).toBe(false);
  });

  test("optional tags match if at least one is present (OR logic)", () => {
    const condition = { required: [], forbidden: [], optional: ["scp", "tale"] };
    expect(evaluateTagCondition(condition, ["scp"])).toBe(true);
    expect(evaluateTagCondition(condition, ["tale"])).toBe(true);
    expect(evaluateTagCondition(condition, ["scp", "tale"])).toBe(true);
  });

  test("optional tags fail if none is present", () => {
    const condition = { required: [], forbidden: [], optional: ["scp", "tale"] };
    expect(evaluateTagCondition(condition, ["joke"])).toBe(false);
    expect(evaluateTagCondition(condition, [])).toBe(false);
  });

  test("mixed required and optional tags", () => {
    const condition = { required: ["fruit"], forbidden: [], optional: ["red", "green"] };
    // Has required + one optional → match
    expect(evaluateTagCondition(condition, ["fruit", "red"])).toBe(true);
    // Has required but no optional → no match
    expect(evaluateTagCondition(condition, ["fruit"])).toBe(false);
    // Has optional but not required → no match
    expect(evaluateTagCondition(condition, ["red"])).toBe(false);
  });

  test("forbidden-only condition matches when forbidden tag absent", () => {
    const condition = { required: [], forbidden: ["admin"], optional: [] };
    expect(evaluateTagCondition(condition, ["fruit"])).toBe(true);
    expect(evaluateTagCondition(condition, [])).toBe(true);
  });

  test("forbidden-only condition fails when forbidden tag present", () => {
    const condition = { required: [], forbidden: ["admin"], optional: [] };
    expect(evaluateTagCondition(condition, ["admin"])).toBe(false);
  });
});
