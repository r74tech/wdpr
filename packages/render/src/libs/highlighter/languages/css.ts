import type { LanguageDefinition } from "../types";

/**
 * CSS syntax highlighting definition.
 * Ported from PEAR Text_Highlighter CSS.php
 * Regex patterns maintain the same capture group structure as PHP version.
 */
export const cssLang: LanguageDefinition = {
  language: "css",
  defClass: "code",
  regs: {
    [-1]: /((@[a-z\d]+))|((((\.|#)?[a-z]+[a-z\d-]*(?![a-z\d-]))|(\*))(?!\s*:\s*[\s{]))|(:[a-z][a-z\d-]*)|(\[)|(\{)/gi,
    0: /(\d*\.?\d+(%|em|ex|pc|pt|px|in|mm|cm))|(\d*\.?\d+)|([a-z][a-z\d-]*)|(#([\da-f]{6}|[\da-f]{3})\b)/gi,
    1: /(')|(")|([\w\-:]+)/gi,
    2: /([a-z][a-z\d-]*\s*:)|((((\.|#)?[a-z]+[a-z\d-]*(?![a-z\d-]))|(\*))(?!\s*:\s*[\s{]))|(\{)/gi,
    3: /(\\[\\(\\)\\])/gi,
    4: /(\\\\|\\"|\\'|\\`)/gi,
    5: /(\\\\|\\"|\\'|\\`|\\t|\\n|\\r)/gi,
  },
  counts: {
    [-1]: [1, 4, 0, 0, 0],
    0: [1, 0, 0, 1],
    1: [0, 0, 0],
    2: [0, 4, 0],
    3: [0],
    4: [0],
    5: [0],
  },
  delim: {
    [-1]: ["", "", "", "brackets", "brackets"],
    0: ["", "", "", ""],
    1: ["quotes", "quotes", ""],
    2: ["reserved", "", "brackets"],
    3: [""],
    4: [""],
    5: [""],
  },
  inner: {
    [-1]: ["var", "identifier", "special", "code", "code"],
    0: ["number", "number", "code", "var"],
    1: ["string", "string", "var"],
    2: ["code", "identifier", "code"],
    3: ["string"],
    4: ["special"],
    5: ["special"],
  },
  end: {
    0: /(?=;|\})/gi,
    1: /\]/gi,
    2: /\}/gi,
    3: /\)/gi,
    4: /'/gi,
    5: /"/gi,
  },
  states: {
    [-1]: [-1, -1, -1, 1, 2],
    0: [-1, -1, -1, -1],
    1: [4, 5, -1],
    2: [0, -1, 2],
    3: [-1],
    4: [-1],
    5: [-1],
  },
  keywords: {
    [-1]: [{}, {}, {}, -1, -1],
    0: [
      {},
      {},
      {
        propertyValue:
          /^(?:far-left|left|center-left|center-right|center|far-right|right-side|right|behind|leftwards|rightwards|inherit|scroll|fixed|transparent|none|repeat-x|repeat-y|repeat|no-repeat|collapse|separate|auto|top|bottom|both|open-quote|close-quote|no-open-quote|no-close-quote|crosshair|default|pointer|move|e-resize|ne-resize|nw-resize|n-resize|se-resize|sw-resize|s-resize|text|wait|help|ltr|rtl|inline|block|list-item|run-in|compact|marker|table|inline-table|table-row-group|table-header-group|table-footer-group|table-row|table-column-group|table-column|table-cell|table-caption|below|level|above|higher|lower|show|hide|caption|icon|menu|message-box|small-caption|status-bar|normal|wider|narrower|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|italic|oblique|small-caps|bold|bolder|lighter|inside|outside|disc|circle|square|decimal|decimal-leading-zero|lower-roman|upper-roman|lower-greek|lower-alpha|lower-latin|upper-alpha|upper-latin|hebrew|armenian|georgian|cjk-ideographic|hiragana|katakana|hiragana-iroha|katakana-iroha|crop|cross|invert|visible|hidden|always|avoid|x-low|low|medium|high|x-high|mix?|repeat?|static|relative|absolute|portrait|landscape|spell-out|once|digits|continuous|code|x-slow|slow|fast|x-fast|faster|slower|justify|underline|overline|line-through|blink|capitalize|uppercase|lowercase|embed|bidi-override|baseline|sub|super|text-top|middle|text-bottom|silent|x-soft|soft|loud|x-loud|pre|nowrap|serif|sans-serif|cursive|fantasy|monospace|empty|string|strict|loose|char|true|false|dotted|dashed|solid|double|groove|ridge|inset|outset|larger|smaller|xx-small|x-small|small|large|x-large|xx-large|all|newspaper|distribute|distribute-all-lines|distribute-center-last|inter-word|inter-ideograph|inter-cluster|kashida|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space|keep-all|break-all|break-word|lr-tb|tb-rl|thin|thick|inline-block|w-resize|hand|distribute-letter|distribute-space|whitespace|male|female|child)$/i,
        namedcolor:
          /^(?:aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|activeborder|activecaption|appworkspace|background|buttonface|buttonhighlight|buttonshadow|buttontext|captiontext|graytext|highlight|highlighttext|inactiveborder|inactivecaption|inactivecaptiontext|infobackground|infotext|menu|menutext|scrollbar|threeddarkshadow|threedface|threedhighlight|threedlightshadow|threedshadow|window|windowframe|windowtext)$/i,
      },
      {},
    ],
    1: [-1, -1, {}],
    2: [-1, {}, -1],
    3: [{}],
    4: [{}],
    5: [{}],
  },
  kwmap: {
    propertyValue: "string",
    namedcolor: "var",
  },
  parts: {
    0: [{ 1: "string" }, null, null, null],
    1: [null, null, null],
    2: [null, null, null],
    3: [null],
    4: [null],
    5: [null],
  },
  subst: {
    [-1]: [false, false, false, false, false],
    0: [false, false, false, false],
    1: [false, false, false],
    2: [false, false, false],
    3: [false],
    4: [false],
    5: [false],
  },
};
