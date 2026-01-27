import type { LanguageDefinition } from "../types";

export const htmlLang: LanguageDefinition = {
  language: "html",
  defClass: "code",
  regs: {
    [-1]: /(<!--)|(<[?/]?)|((&)[\w\-.]+;)/gi,
    0: null,
    1: /((?<=[</?])[\w\-:]+)|([\w\-:]+)|(")/gi,
    2: /((&)[\w\-.]+;)/gi,
  },
  counts: {
    [-1]: [0, 0, 1],
    0: [],
    1: [0, 0, 0],
    2: [1],
  },
  delim: {
    [-1]: ["comment", "brackets", ""],
    0: [],
    1: ["", "", "quotes"],
    2: [""],
  },
  inner: {
    [-1]: ["comment", "code", "special"],
    0: [],
    1: ["reserved", "var", "string"],
    2: ["special"],
  },
  end: {
    0: /-->/gi,
    1: /[/?]?>/gi,
    2: /"/gi,
  },
  states: {
    [-1]: [0, 1, -1],
    0: [],
    1: [-1, -1, 2],
    2: [-1],
  },
  keywords: {
    [-1]: [-1, -1, {}],
    0: [],
    1: [],
    2: [{}],
  },
  kwmap: {},
  parts: {
    0: [],
    1: [null, null, null],
    2: [null],
  },
  subst: {
    [-1]: [false, false, false],
    0: [],
    1: [false, false, false],
    2: [false],
  },
};
