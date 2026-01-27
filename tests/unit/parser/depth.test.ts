import { test, expect, describe } from "bun:test";
import { processDepths, type DepthItem } from "../../../packages/parser/src/parser/depth";

// Helper functions
function item<L, T>(value: T): DepthItem<L, T> {
  return { kind: "item", value };
}

function list<L, T>(ltype: L, children: DepthItem<L, T>[]): DepthItem<L, T> {
  return { kind: "list", ltype, children };
}

describe("processDepths", () => {
  describe("unit type (uniform list type)", () => {
    test("single item at depth 0", () => {
      const result = processDepths<null, string>(null, [{ depth: 0, ltype: null, value: "a" }]);
      expect(result).toEqual([{ ltype: null, list: [item("a")] }]);
    });

    test("two items at depth 0", () => {
      const result = processDepths<null, string>(null, [
        { depth: 0, ltype: null, value: "a" },
        { depth: 0, ltype: null, value: "b" },
      ]);
      expect(result).toEqual([{ ltype: null, list: [item("a"), item("b")] }]);
    });

    test("three items, last nested", () => {
      const result = processDepths<null, string>(null, [
        { depth: 0, ltype: null, value: "a" },
        { depth: 0, ltype: null, value: "b" },
        { depth: 1, ltype: null, value: "c" },
      ]);
      expect(result).toEqual([
        { ltype: null, list: [item("a"), item("b"), list(null, [item("c")])] },
      ]);
    });

    test("three items, skip to depth 2", () => {
      const result = processDepths<null, string>(null, [
        { depth: 0, ltype: null, value: "a" },
        { depth: 0, ltype: null, value: "b" },
        { depth: 2, ltype: null, value: "c" },
      ]);
      expect(result).toEqual([
        { ltype: null, list: [item("a"), item("b"), list(null, [list(null, [item("c")])])] },
      ]);
    });

    test("two items starting at depth 1", () => {
      const result = processDepths<null, string>(null, [
        { depth: 1, ltype: null, value: "a" },
        { depth: 1, ltype: null, value: "b" },
      ]);
      expect(result).toEqual([{ ltype: null, list: [list(null, [item("a"), item("b")])] }]);
    });

    test("two items starting at depth 2", () => {
      const result = processDepths<null, string>(null, [
        { depth: 2, ltype: null, value: "a" },
        { depth: 2, ltype: null, value: "b" },
      ]);
      expect(result).toEqual([
        { ltype: null, list: [list(null, [list(null, [item("a"), item("b")])])] },
      ]);
    });

    test("decreasing depth", () => {
      const result = processDepths<null, string>(null, [
        { depth: 2, ltype: null, value: "a" },
        { depth: 1, ltype: null, value: "b" },
      ]);
      expect(result).toEqual([
        { ltype: null, list: [list(null, [list(null, [item("a")]), item("b")])] },
      ]);
    });

    test("very deep single item", () => {
      const result = processDepths<null, string>(null, [{ depth: 5, ltype: null, value: "a" }]);
      expect(result).toEqual([
        {
          ltype: null,
          list: [list(null, [list(null, [list(null, [list(null, [list(null, [item("a")])])])])])],
        },
      ]);
    });

    test("complex nesting pattern", () => {
      const result = processDepths<null, string>(null, [
        { depth: 2, ltype: null, value: "a" },
        { depth: 3, ltype: null, value: "b" },
        { depth: 1, ltype: null, value: "c" },
        { depth: 1, ltype: null, value: "d" },
        { depth: 2, ltype: null, value: "e" },
        { depth: 0, ltype: null, value: "f" },
      ]);
      expect(result).toEqual([
        {
          ltype: null,
          list: [
            list(null, [
              list(null, [item("a"), list(null, [item("b")])]),
              item("c"),
              item("d"),
              list(null, [item("e")]),
            ]),
            item("f"),
          ],
        },
      ]);
    });
  });

  describe("with list types", () => {
    test("empty input", () => {
      const result = processDepths<string, string>(" ", []);
      expect(result).toEqual([]);
    });

    test("single item", () => {
      const result = processDepths<string, string>(" ", [{ depth: 0, ltype: "*", value: "a" }]);
      expect(result).toEqual([{ ltype: "*", list: [item("a")] }]);
    });

    test("two items same type", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 0, ltype: "*", value: "a" },
        { depth: 0, ltype: "*", value: "b" },
      ]);
      expect(result).toEqual([{ ltype: "*", list: [item("a"), item("b")] }]);
    });

    test("two items different types at depth 0", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 0, ltype: "*", value: "a" },
        { depth: 0, ltype: "#", value: "b" },
      ]);
      expect(result).toEqual([
        { ltype: "*", list: [item("a")] },
        { ltype: "#", list: [item("b")] },
      ]);
    });

    test("two items different types at depth 1", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 1, ltype: "*", value: "a" },
        { depth: 1, ltype: "#", value: "b" },
      ]);
      expect(result).toEqual([
        { ltype: " ", list: [list("*", [item("a")]), list("#", [item("b")])] },
      ]);
    });

    test("type change at depth 1 then back to depth 0", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 1, ltype: "*", value: "a" },
        { depth: 1, ltype: "#", value: "b" },
        { depth: 0, ltype: "*", value: "c" },
      ]);
      expect(result).toEqual([
        { ltype: " ", list: [list("*", [item("a")]), list("#", [item("b")])] },
        { ltype: "*", list: [item("c")] },
      ]);
    });

    test("type change at depth 2", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 2, ltype: "*", value: "a" },
        { depth: 2, ltype: "#", value: "b" },
      ]);
      expect(result).toEqual([
        {
          ltype: " ",
          list: [list("*", [list("*", [item("a")]), list("#", [item("b")])])],
        },
      ]);
    });

    test("nested mixed types", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 0, ltype: "#", value: "a" },
        { depth: 2, ltype: "*", value: "b" },
        { depth: 2, ltype: "*", value: "c" },
        { depth: 1, ltype: "*", value: "d" },
      ]);
      expect(result).toEqual([
        {
          ltype: "#",
          list: [item("a"), list("*", [list("*", [item("b"), item("c")]), item("d")])],
        },
      ]);
    });

    test("bullet then numbered then bullet at depth 0", () => {
      const result = processDepths<string, string>(" ", [
        { depth: 0, ltype: "#", value: "a" },
        { depth: 0, ltype: "#", value: "b" },
        { depth: 0, ltype: "*", value: "c" },
        { depth: 1, ltype: "#", value: "d" },
      ]);
      expect(result).toEqual([
        { ltype: "#", list: [item("a"), item("b")] },
        { ltype: "*", list: [item("c"), list("#", [item("d")])] },
      ]);
    });
  });
});
