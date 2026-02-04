import { describe, expect, it } from "bun:test";
import type { SyntaxTree } from "@wdprlib/ast";
import { renderToHtml, type ResolvedUser, type RenderOptions } from "@wdprlib/render";
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures");

/**
 * Mock user database for testing
 * Simulates Wikidot's user resolution behavior
 */
const MOCK_USERS: Record<string, { id: number; name: string }> = {
  alice: { id: 1, name: "Alice" },
  bob: { id: 2, name: "Bob" },
  system: { id: 3, name: "system" },
};

/**
 * Create a mock user resolver that mimics Wikidot's behavior
 */
function createMockUserResolver(): (username: string) => ResolvedUser | null {
  return (username: string): ResolvedUser | null => {
    const normalized = username.toLowerCase().trim();

    // "anonymous" is special - returns null to render as "Anonymous" text
    if (normalized === "anonymous") {
      return null;
    }

    const user = MOCK_USERS[normalized];
    if (!user) {
      return null;
    }

    // Generate Wikidot-style URLs
    const baseUrl = "http://www.wikidot.com";
    return {
      name: user.name,
      url: `${baseUrl}/user:info/${normalized}`,
      avatarUrl: `${baseUrl}/avatar.php?userid=${user.id}&size=small&timestamp=0`,
      karmaUrl: `${baseUrl}/userkarma.php?u=${user.id}`,
    };
  };
}

/**
 * renderテストから除外するfixture
 * 除外する場合は理由をコメントで記載すること
 */
const EXCLUDED_FIXTURES = new Set<string>([
  // "include/wikidot", // includeは外部ページ展開後のHTMLのため比較不可
  // "module/listpages", // ListPagesは動的コンテンツのため比較不可
  // "module/listpages-misc", // 同上
  // "module/backlinks/basic", // Backlinksは動的コンテンツ
  // "module/listusers/basic", // ListUsersは動的コンテンツ
  // "module/listusers/fail", // 同上
  // "module/pagetree", // PageTreeは動的コンテンツ（resolver未実装）
  // "table/fail-paragraph", // リンク解釈・段落内改行処理の問題（別issueで対応）
  // "expr/edge-cases", // エラーメッセージがWikidotと異なる（スタックベース vs 再帰下降）
  // "misc/bibliography", // bibliography機能（bibcite/bibitems）が未実装
  // "image/basic", // アライメント付き画像の段落エスケープが未実装
  // "image/fail", // 同上
]);

/**
 * output.htmlが不要なfixture
 */
const NO_OUTPUT_REQUIRED = new Set<string>([
  // 動的モジュール系はここに追加
]);

interface TestCase {
  category: string;
  expectedPath: string;
  outputPath: string | null;
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
    const outputPath = path.join(dir, "output.html");
    const hasOutput = fs.existsSync(outputPath);

    if (hasExpected) {
      cases.push({
        category: prefix,
        expectedPath: path.join(dir, "expected.json"),
        outputPath: hasOutput ? outputPath : null,
      });
    }
  }

  walk(FIXTURES_DIR, "");
  return cases;
}

/**
 * HTML正規化ルール
 * Wikidotの出力とwdparserの出力の許容される差異のみ正規化
 */
function normalizeHtml(html: string): string {
  return (
    html
      // 改行の正規化
      .replace(/\r\n/g, "\n")
      // onclick属性を削除（Wikidot固有のJS）
      .replace(/ onclick="[^"]*"/g, "")
      // タグ前後の改行を削除（ブロック要素の前後の改行はHTML的に無意味）
      .replace(/\n\s*</g, "<")
      .replace(/>\s*\n/g, ">")
      // 残りの連続空白を単一スペースに（HTML的に等価）
      .replace(/[ \t]+/g, " ")
      // 属性順序を正規化（HTML的に等価）
      .replace(
        /<(\w+)((?:\s+[a-zA-Z_][\w-]*(?:="[^"]*")?)+)\s*(\/?)>/g,
        (_match, tag, attrStr, selfClose) => {
          const attrs = attrStr.trim().match(/[a-zA-Z_][\w-]*(?:="[^"]*")?/g) || [];
          attrs.sort();
          return `<${tag} ${attrs.join(" ")}${selfClose ? " /" : ""}>`;
        },
      )
      // タグ間の空白を削除
      .replace(/>\s+</g, "><")
      // <br />前後の空白を削除（HTML的に等価）
      .replace(/\s*<br\s*\/?>\s*/gi, "<br />")
      // HTMLエンティティをUnicodeに統一
      .replace(/&#171;/g, "\u00AB") // «
      .replace(/&#187;/g, "\u00BB") // »
      .replace(/&#8212;/g, "\u2014") // —
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // 前後の空白を削除
      .trim()
  );
}

/**
 * 環境変数でフィルタリングするfixtureカテゴリ
 * 例: FIXTURE_FILTER=image/fail bun test tests/integration/fixture-render.test.ts
 */
function getFixtureFilter(): string | undefined {
  return process.env.FIXTURE_FILTER;
}

const FIXTURE_FILTER = getFixtureFilter();

function matchesFilter(category: string): boolean {
  if (!FIXTURE_FILTER) {
    return true;
  }
  // 完全一致または前方一致でマッチ
  return category === FIXTURE_FILTER || category.startsWith(`${FIXTURE_FILTER}/`);
}

const allCases = discoverTestCases();
const includedCases = allCases.filter(
  (c) => !EXCLUDED_FIXTURES.has(c.category) && matchesFilter(c.category),
);
const casesWithOutput = includedCases.filter((c) => c.outputPath !== null);
const casesRequiringOutput = includedCases.filter(
  (c) => c.outputPath === null && !NO_OUTPUT_REQUIRED.has(c.category),
);

describe("Render Fixture Tests", () => {
  describe("HTML output verification", () => {
    for (const testCase of casesWithOutput) {
      it(`[${testCase.category}] rendered HTML should match expected`, () => {
        const expectedJson = fs.readFileSync(testCase.expectedPath, "utf-8");
        const syntaxTree: SyntaxTree = JSON.parse(expectedJson);
        const expectedHtml = fs.readFileSync(testCase.outputPath!, "utf-8");

        const options: RenderOptions = {
          page: {
            pageName: "some-page",
          },
          resolvers: {
            user: createMockUserResolver(),
          },
        };
        const rendered = renderToHtml(syntaxTree, options);
        expect(normalizeHtml(rendered)).toBe(normalizeHtml(expectedHtml));
      });
    }
  });

  describe("Coverage check", () => {
    it("all fixtures with expected.json should have output.html (unless explicitly excluded)", () => {
      if (casesRequiringOutput.length > 0) {
        const missing = casesRequiringOutput.map((c) => c.category);
        throw new Error(
          `Missing output.html for ${missing.length} fixture(s):\n  - ${missing.join("\n  - ")}\n\n` +
          `Add output.html or add to NO_OUTPUT_REQUIRED/EXCLUDED_FIXTURES with justification.`,
        );
      }
    });
  });
});

// Summary output
const excludedCount = allCases.filter((c) => EXCLUDED_FIXTURES.has(c.category)).length;

console.log("\n[Render Fixtures]");
if (FIXTURE_FILTER) {
  console.log(`  Filter: ${FIXTURE_FILTER}`);
}
console.log(`  Total with expected.json: ${allCases.length}`);
console.log(`  Tested: ${casesWithOutput.length}`);
console.log(`  Excluded: ${excludedCount}`);
console.log(`  Missing output.html: ${casesRequiringOutput.length}`);
