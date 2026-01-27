import type { LanguageDefinition } from "../types";

export const xmlLang: LanguageDefinition = {
  language: "xml",
  defClass: "code",
  regs: {
    [-1]: /(<!\[CDATA\[)|(<!--)|(<[?/]?)|((&|%)[\w\-.]+;)/gi,
    0: null,
    1: null,
    2: /((?<=[</?])[\w\-:]+)|([\w\-:]+)|(")/gi,
    3: /((&|%)[\w\-.]+;)/gi,
  },
  counts: {
    [-1]: [0, 0, 0, 1],
    0: [],
    1: [],
    2: [0, 0, 0],
    3: [1],
  },
  delim: {
    [-1]: ["comment", "comment", "brackets", ""],
    0: [],
    1: [],
    2: ["", "", "quotes"],
    3: [""],
  },
  inner: {
    [-1]: ["comment", "comment", "code", "special"],
    0: [],
    1: [],
    2: ["reserved", "var", "string"],
    3: ["special"],
  },
  end: {
    0: /\]\]>/gi,
    1: /-->/gi,
    2: /[/?]?>/gi,
    3: /"/gi,
  },
  states: {
    [-1]: [0, 1, 2, -1],
    0: [],
    1: [],
    2: [-1, -1, 3],
    3: [-1],
  },
  keywords: {
    [-1]: [-1, -1, -1, {}],
    0: [],
    1: [],
    2: [{}, {}, -1],
    3: [{}],
  },
  kwmap: {},
  parts: {
    0: [],
    1: [],
    2: [null, null, null],
    3: [null],
  },
  subst: {
    [-1]: [false, false, false, false],
    0: [],
    1: [],
    2: [false, false, false],
    3: [false],
  },
};
