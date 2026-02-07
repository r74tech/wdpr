/**
 * llms.txt 後処理スクリプト
 *
 * typedoc-plugin-llms-txt が docs/llms/ 内に生成した llms.txt を
 * docs/ ルートに移動し、リンクパスを調整する。
 * 併せて全 Markdown を結合した llms-full.txt を生成する。
 *
 * Usage: bun scripts/build-llms.ts
 */

import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

const DOCS_DIR = "docs";
const LLMS_DIR = join(DOCS_DIR, "llms");
const LLMS_TXT_SRC = join(LLMS_DIR, "llms.txt");
const LLMS_TXT_DEST = join(DOCS_DIR, "llms.txt");
const LLMS_FULL_DEST = join(DOCS_DIR, "llms-full.txt");

// Markdown リンク [text](path) のうちローカル相対パスのみ変換する正規表現
// http/https/mailto/tel/#anchor は除外
const MD_LINK_RE = /\]\((?!https?:\/\/|#|mailto:|tel:)([^)]+)\)/g;

async function collectMdFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMdFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  // 1. llms.txt の読み込みと検証
  if (!existsSync(LLMS_TXT_SRC)) {
    console.error(`Error: ${LLMS_TXT_SRC} not found. Run typedoc --options typedoc.llms.json first.`);
    process.exit(1);
  }

  const llmsTxt = await Bun.file(LLMS_TXT_SRC).text();

  // 2. 相対パスに llms/ プレフィックスを付与
  const brokenLinks: string[] = [];
  const transformed = llmsTxt.replace(MD_LINK_RE, (_match, path: string) => {
    const newPath = `llms/${path}`;
    const filePath = join(DOCS_DIR, newPath);
    if (!existsSync(filePath)) {
      brokenLinks.push(`${path} -> ${filePath}`);
    }
    return `](${newPath})`;
  });

  // 3. docs/llms.txt として保存
  await Bun.write(LLMS_TXT_DEST, transformed);
  console.log(`Generated: ${LLMS_TXT_DEST}`);

  // 4. リンク存在チェック
  if (brokenLinks.length > 0) {
    console.error("Broken links detected in llms.txt:");
    for (const link of brokenLinks) {
      console.error(`  - ${link}`);
    }
    process.exit(1);
  }

  // 5. 全 .md ファイルを収集してソート
  const mdFiles = await collectMdFiles(LLMS_DIR);
  mdFiles.sort();

  // 6. llms-full.txt を生成
  const parts: string[] = [];
  // ヘッダー部分（llms.txt の内容をそのまま含める）
  parts.push(transformed);
  parts.push("\n---\n");

  for (const filePath of mdFiles) {
    const relPath = relative(DOCS_DIR, filePath);
    const content = await Bun.file(filePath).text();
    parts.push(`\n## ${relPath}\n\n${content.trim()}\n`);
  }

  await Bun.write(LLMS_FULL_DEST, parts.join("\n"));
  console.log(`Generated: ${LLMS_FULL_DEST}`);

  // 7. サマリー
  const fullSize = (await stat(LLMS_FULL_DEST)).size;
  console.log(`Summary: ${mdFiles.length} markdown files, llms-full.txt = ${(fullSize / 1024).toFixed(1)} KB`);
}

main();
