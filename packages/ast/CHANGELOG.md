## 1.1.1 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### ❤️ Thank You

- r74tech @r74tech

# Changelog

## 1.1.0 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

### 🚀 Features

- bibliography/bibcite 構文を実装 ([d837dd6](https://github.com/r74tech/wdpr/commit/d837dd6))
- [[embed]] ブロックを実装 ([dc4b585](https://github.com/r74tech/wdpr/commit/dc4b585))

### 🩹 Fixes

- html 要素のパース・レンダリング修正 ([a406bd6](https://github.com/r74tech/wdpr/commit/a406bd6))
- EmbedBlockData を ast から export ([c293fd2](https://github.com/r74tech/wdpr/commit/c293fd2))
- ast package.json から bun exports condition を削除し dist を参照するよう修正 ([58facd5](https://github.com/r74tech/wdpr/commit/58facd5))

## 0.1.0 (2026-01-31)

初期リリース。Wikidot マークアップの AST 型定義とファクトリ関数を提供。
