import { describe, expect, it } from "bun:test";
import type { SyntaxTree } from "@wdprlib/ast";
import { serialize } from "@wdprlib/decompiler";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import * as fs from "fs";
import * as path from "path";

/**
 * Roundtrip テスト: AST → serialize → parse → render の構造等価性検証
 *
 * serialize結果が元のinput.ftmlと完全一致しなくても、
 * 再パース→再レンダリングで同じHTMLが生成されれば合格とする。
 * lossy変換（空行数、ダッシュ数、_サフィックス等）を許容する。
 */

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures");

/** decompiler対象外のfixture */
const EXCLUDED_FIXTURES = new Set<string>([
  "module/listpages",
  "module/listpages-misc",
  "module/listusers/basic",
  "module/listusers/fail",
  "module/pagetree",
  "module/categories",
  "module/fail",
  "module/rate",
  "module/join",
  "module/css",
  "module/backlinks/basic",
  "module/backlinks/fail",
  "include/basic",
  "include/args",
  "include/nested",
  "include/wikidot",
  "iftags/basic",
  "iftags/fail",
  "user/basic",
  "user/fail",
  "html/basic",
  "html/fail",
  "expr/basic",
  "expr/edge-cases",
  "expr/if",
  "expr/functions",
  "expr/ifexpr",
  "toc/basic",
  "toc/fail",
  "misc/comment",
]);

/**
 * roundtripテストで追加除外するfixture
 * serialize自体が意味のある出力を生成できないケース
 */
const SKIP_ROUNDTRIP = new Set<string>([
  ...EXCLUDED_FIXTURES,
  // エラーケース: パーサーのエラーリカバリが生成する特殊なAST構造
  "div/fail",
  "link/fail",
  "collapsible/fail",
  "list/block-fail",
  "list/native-fail",
  // lossy変換: ブロック構文の属性（class, id, style, rowspan等）がパイプ/ネイティブ構文で失われる
  "table/advanced",
  "table/nest",
  "list/block",
  // lossy変換: 複数@やアングルブラケットrawの複雑なエスケープ
  "raw/basic",
  // lossy変換: paragraph 外に置かれた image / aligned image を serialize
  // して再 parse すると decompiler 側で paragraph 構造を 1:1 で復元できず、
  // <br /> 結合や aligned image 分割の有無で diff が出る。 parser 側の
  // postprocess に追従した decompiler 対応は別 PR で扱う。
  "image/basic",
]);

interface TestCase {
  category: string;
  expectedPath: string;
}

function discoverTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  function walk(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      }
    }

    const hasExpected = entries.some((e) => e.name === "expected.json");
    if (!hasExpected) return;

    cases.push({
      category: prefix,
      expectedPath: path.join(dir, "expected.json"),
    });
  }

  walk(FIXTURES_DIR, "");
  return cases;
}

/**
 * HTML正規化（fixture-render.test.tsと同じロジック）
 */
function normalizeHtml(html: string): string {
  return (
    html
      .replace(/\r\n/g, "\n")
      .replace(/ onclick="[^"]*"/g, "")
      .replace(/\n\s*</g, "<")
      .replace(/>\s*\n/g, ">")
      .replace(/[ \t]+/g, " ")
      .replace(
        /<(\w+)((?:\s+[a-zA-Z_][\w-]*(?:="[^"]*")?)+)\s*(\/?)>/g,
        (_match, tag, attrStr, selfClose) => {
          const attrs = (attrStr as string).trim().match(/[a-zA-Z_][\w-]*(?:="[^"]*")?/g) || [];
          attrs.sort();
          return `<${tag} ${attrs.join(" ")}${selfClose ? " /" : ""}>`;
        },
      )
      .replace(/>\s+</g, "><")
      .replace(/\s*<br\s*\/?>\s*/gi, "<br />")
      // 段落・ブロック要素の閉じタグ直前の<br />は表示上無意味なため除去
      .replace(/<br \/><\/p>/gi, "</p>")
      .replace(/<br \/><\/div>/gi, "</div>")
      .replace(/<br \/><\/blockquote>/gi, "</blockquote>")
      .replace(/&#171;/g, "\u00AB")
      .replace(/&#187;/g, "\u00BB")
      .replace(/&#8212;/g, "\u2014")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim()
  );
}

function getFixtureFilter(): string | undefined {
  return process.env.FIXTURE_FILTER;
}

const FIXTURE_FILTER = getFixtureFilter();

function matchesFilter(category: string): boolean {
  if (!FIXTURE_FILTER) return true;
  return category === FIXTURE_FILTER || category.startsWith(`${FIXTURE_FILTER}/`);
}

const allCases = discoverTestCases();
const filteredCases = allCases.filter((c) => matchesFilter(c.category));
const roundtripCases = filteredCases.filter((c) => !SKIP_ROUNDTRIP.has(c.category));

describe("Serialize Roundtrip: AST → serialize → parse → render", () => {
  for (const testCase of roundtripCases) {
    it(`[${testCase.category}] roundtrip should produce equivalent HTML`, () => {
      const expectedJson = fs.readFileSync(testCase.expectedPath, "utf-8");
      const syntaxTree: SyntaxTree = JSON.parse(expectedJson);

      // 元のASTをレンダリング
      const originalHtml = renderToHtml(syntaxTree);

      // AST → serialize → parse → render
      const source = serialize(syntaxTree);
      const { ast: reparsedAst } = parse(source);
      const roundtripHtml = renderToHtml(reparsedAst);

      expect(normalizeHtml(roundtripHtml)).toBe(normalizeHtml(originalHtml));
    });
  }
});

// Summary
const skipped = filteredCases.filter((c) => SKIP_ROUNDTRIP.has(c.category)).length;
console.log("\n[Roundtrip Tests]");
if (FIXTURE_FILTER) {
  console.log(`  Filter: ${FIXTURE_FILTER}`);
}
console.log(`  Total: ${allCases.length}`);
console.log(`  Roundtrip: ${roundtripCases.length} tested, ${skipped} skipped`);
