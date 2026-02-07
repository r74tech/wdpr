/**
 * @module libs/highlighter
 *
 * TypeScript port of PEAR Text_Highlighter 0.5.1 for server-side
 * syntax highlighting of `[[code]]` blocks.
 *
 * Supports the same languages as Wikidot's original PHP implementation:
 * CSS, C++, Diff, DTD, HTML, Java, JavaScript, PHP, Python, Ruby, SQL,
 * and XML. Perl is excluded because its definition relies on PCRE-only
 * regex features.
 *
 * Original: http://pear.php.net/package/Text_Highlighter
 * Author: Andrey Demenev <demenev@on-line.jar.ru>
 * Copyright: 2004 Andrey Demenev
 * License: PHP License 3.0 (http://www.php.net/license/3_0.txt)
 */

import type { LanguageDefinition } from "./types";
import { tokenize, renderTokens } from "./engine";
import { cssLang } from "./languages/css";
import { cppLang } from "./languages/cpp";
import { diffLang } from "./languages/diff";
import { dtdLang } from "./languages/dtd";
import { htmlLang } from "./languages/html";
import { javaLang } from "./languages/java";
import { javascriptLang } from "./languages/javascript";
import { phpLang } from "./languages/php";
import { pythonLang } from "./languages/python";
import { rubyLang } from "./languages/ruby";
import { sqlLang } from "./languages/sql";
import { xmlLang } from "./languages/xml";

/**
 * Registry of supported language definitions, keyed by lowercase name.
 *
 * `xhtml` is aliased to `html` (they share the same definition).
 */
const LANGUAGES: Record<string, LanguageDefinition> = {
  css: cssLang,
  cpp: cppLang,
  diff: diffLang,
  dtd: dtdLang,
  html: htmlLang,
  java: javaLang,
  javascript: javascriptLang,
  // perl: excluded (PCRE-only features)
  php: phpLang,
  python: pythonLang,
  ruby: rubyLang,
  sql: sqlLang,
  xml: xmlLang,
  xhtml: htmlLang,
};

/**
 * Highlight source code using the Text_Highlighter-compatible engine.
 *
 * @param code - Raw source code to highlight.
 * @param language - Programming language name (case-insensitive).
 * @returns HTML string with `hl-*` class spans wrapped in
 *   `<div class="hl-main"><pre>...</pre></div>`, or `null` if the
 *   language is not supported.
 */
export function highlight(code: string, language: string): string | null {
  const def = LANGUAGES[language.toLowerCase()];
  if (!def) return null;
  const tokens = tokenize(def, code);
  return renderTokens(tokens);
}
