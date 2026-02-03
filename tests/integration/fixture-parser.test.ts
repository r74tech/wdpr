import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import type { SyntaxTree } from "@wdprlib/ast";
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures");

/**
 * 明示的に除外するfixture（未実装機能など）
 * 除外する場合は理由をコメントで記載すること
 */
const EXCLUDED_FIXTURES = new Set<string>([
  // 例: "code/unsupported", // 未実装の構文
]);

/**
 * AST比較から除外するfixture（expected.jsonがあっても比較しない）
 * パースエラーなしのテストは行う
 */
const SKIP_AST_COMPARISON = new Set<string>([
  "include/wikidot", // includeは外部ページ依存のためAST固定不可
  // "table/nest", // インライン位置の[[table]]パースは未実装（issue参照）
  // "table/advanced", // セル内テキストのparagraphラップ判定が未実装（issue参照）
  // "tabview/basic", // expected.jsonがoutput.htmlと不整合（issue参照）
]);

/**
 * expected.jsonが不要なfixture
 */
const NO_EXPECTED_REQUIRED = new Set<string>([
  // 現時点ではなし
]);

interface FixtureCase {
  category: string;
  name: string;
  inputPath: string;
  expectedPath: string | null;
}

function findFixtureCases(dir: string, category = ""): FixtureCase[] {
  const cases: FixtureCase[] = [];

  if (!fs.existsSync(dir)) {
    return cases;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const newCategory = category ? `${category}/${entry.name}` : entry.name;
      cases.push(...findFixtureCases(fullPath, newCategory));
    } else if (entry.name === "input.ftml") {
      const expectedPath = path.join(dir, "expected.json");
      cases.push({
        category,
        name: path.basename(dir),
        inputPath: fullPath,
        expectedPath: fs.existsSync(expectedPath) ? expectedPath : null,
      });
    }
  }

  return cases;
}

function loadInput(inputPath: string): string {
  return fs.readFileSync(inputPath, "utf-8");
}

function loadExpected(expectedPath: string): SyntaxTree {
  return JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
}

/**
 * 環境変数でフィルタリングするfixtureカテゴリ
 * 例: FIXTURE_FILTER=image/fail bun test tests/integration/fixture-parser.test.ts
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

const allCases = findFixtureCases(FIXTURES_DIR);
const includedCases = allCases.filter(
  (c) => !EXCLUDED_FIXTURES.has(c.category) && matchesFilter(c.category),
);
const casesWithExpected = includedCases.filter(
  (c) => c.expectedPath !== null && !SKIP_AST_COMPARISON.has(c.category),
);
const casesRequiringExpected = includedCases.filter(
  (c) =>
    c.expectedPath === null &&
    !NO_EXPECTED_REQUIRED.has(c.category) &&
    !SKIP_AST_COMPARISON.has(c.category),
);

describe("Parser Fixture Tests", () => {
  describe("Parse without errors", () => {
    for (const testCase of includedCases) {
      it(`[${testCase.category}] should parse without throwing`, () => {
        const input = loadInput(testCase.inputPath);
        expect(() => parse(input)).not.toThrow();
      });
    }
  });

  describe("AST verification", () => {
    for (const testCase of casesWithExpected) {
      it(`[${testCase.category}] AST should match expected`, () => {
        const input = loadInput(testCase.inputPath);
        const result = parse(input);
        const expected = loadExpected(testCase.expectedPath!);

        expect(result).toEqual(expected);
      });
    }
  });

  describe("Coverage check", () => {
    it("all fixtures should have expected.json (unless explicitly excluded)", () => {
      if (casesRequiringExpected.length > 0) {
        const missing = casesRequiringExpected.map((c) => c.category);
        throw new Error(
          `Missing expected.json for ${missing.length} fixture(s):\n  - ${missing.join("\n  - ")}\n\n` +
            `Add expected.json or add to NO_EXPECTED_REQUIRED with justification.`,
        );
      }
    });
  });
});

// Summary output
const excludedCount = allCases.length - includedCases.length;
const noExpectedCount = includedCases.filter((c) => NO_EXPECTED_REQUIRED.has(c.category)).length;

console.log("\n[Parser Fixtures]");
if (FIXTURE_FILTER) {
  console.log(`  Filter: ${FIXTURE_FILTER}`);
}
console.log(`  Total: ${allCases.length}`);
console.log(`  Tested: ${includedCases.length}`);
console.log(`  Excluded: ${excludedCount}`);
console.log(`  With expected.json: ${casesWithExpected.length}`);
console.log(`  No expected required: ${noExpectedCount}`);
console.log(`  Missing expected.json: ${casesRequiringExpected.length}`);
