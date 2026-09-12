import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { preprocess } from "../../../packages/parser/src/parser/preprocess";

test("keeps a nested code header with triple links inside the protected body", () => {
  const body = "[[code name=[[[bar]]] ]]\n[[/code]]\n日本語 tail...";
  const raw = `[[code]]\n${body}\n[[/code]]`;
  expect(preprocess(`${raw}\n\noutside...`)).toBe(`${raw}\n\noutside…`);
  expect(parse(`${raw}\n\noutside...`).ast["code-blocks"]).toEqual([
    { contents: body, language: null, name: null },
  ]);
});

test("does not count a triple close as a nested code header", () => {
  const raw = "[[code]]\n[[code]]]\n[[/code]]";
  expect(preprocess(`${raw}\ntail...\n[[/code]]\n\noutside...`)).toBe(
    `${raw}\ntail…\n[[/code]]\n\noutside…`,
  );
  expect(parse(`${raw}\n\noutside...`).ast["code-blocks"]).toEqual([
    { contents: "[[code]]]", language: null, name: null },
  ]);
});

test("keeps typography outside a code closed inside its malformed quoted attribute", () => {
  const raw = '[[code type="x]]a[[/code]]"';
  expect(preprocess(`${raw}\n\noutside...`)).toBe(`${raw}\n\noutside…`);
  expect(parse(`${raw}\n\noutside...`).ast["code-blocks"]).toEqual([
    { contents: "", language: "x", name: null },
  ]);
});

test("maps quoted delimiters and CJK prefixes to the same code body", () => {
  const raw = '[[code name="a]]b"]]\n本文...\n[[/code]]';
  expect(preprocess(`前置...\n\n${raw}\n\n後置...`)).toBe(`前置…\n\n${raw}\n\n後置…`);
  expect(parse(`前置...\n\n${raw}\n\n後置...`).ast["code-blocks"]).toEqual([
    { contents: "本文...", language: null, name: "a]]b" },
  ]);
});

test("requires a complete unprotected closing tag", () => {
  const body = "@@[[/code]]@@\n@<[[/code]]>@\n[[/code\n日本語...";
  const raw = `[[code]]\n${body}\n[[/code ]]`;
  expect(preprocess(`${raw}\n\noutside...`)).toBe(`${raw}\n\noutside…`);
  expect(parse(`${raw}\n\noutside...`).ast["code-blocks"]).toEqual([
    { contents: body, language: null, name: null },
  ]);
});
