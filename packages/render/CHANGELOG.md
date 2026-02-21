## 1.3.3 (2026-02-21)

### 🩹 Fixes

- includeの行頭限定とembed iframeのstyle/class属性保持 ([#29](https://github.com/r74tech/wdpr/pull/29))

### ❤️ Thank You

- r74tech @r74tech

## 1.3.2 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

## 1.3.1 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.2.1

### ❤️ Thank You

- r74tech @r74tech

## 1.3.0 (2026-02-12)

This was a version bump only for @wdprlib/render to align it with other projects, there were no code changes.

## 1.2.4 (2026-02-12)

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.2.0

## 1.2.3 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.2 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.1.1

### ❤️ Thank You

- r74tech @r74tech

## 1.2.1 (2026-02-08)

### 🚀 Features

- llms.txt + Markdown ドキュメント生成を追加 ([#17](https://github.com/r74tech/wdpr/pull/17))

### 🩹 Fixes

- パーサー・レンダラーの軽微なバグ4件を修正 ([#18](https://github.com/r74tech/wdpr/pull/18), [#7](https://github.com/r74tech/wdpr/issues/7))
- polynomial ReDoSの正規表現パターンを修正 ([#15](https://github.com/r74tech/wdpr/pull/15), [#20](https://github.com/r74tech/wdpr/issues/20), [#23](https://github.com/r74tech/wdpr/issues/23), [#24](https://github.com/r74tech/wdpr/issues/24))

### ❤️ Thank You

- r74tech @r74tech

# Changelog

## 1.2.0 (2026-02-07)

### 🚀 Features

- embed-block でプロトコル相対 URL と HTTP スキームを対応 ([#14](https://github.com/r74tech/wdpr/pull/14))

## 1.1.0 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.1 (2026-02-07)

### ♻️ Refactors

- jsdom + DOMPurify を sanitize-html + htmlparser2 に置き換え ([#11](https://github.com/r74tech/wdpr/pull/11))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

### 🚀 Features

- embed-block に DOMPurify を導入 ([3d95f84](https://github.com/r74tech/wdpr/commit/3d95f84))
- bibliography/bibcite 構文を実装 ([d837dd6](https://github.com/r74tech/wdpr/commit/d837dd6))
- math 要素のレンダリングを MathML + SVG ポリフィル方式に変更 ([1970d03](https://github.com/r74tech/wdpr/commit/1970d03))
- [[embed]] ブロックを実装 ([dc4b585](https://github.com/r74tech/wdpr/commit/dc4b585))
- iftags の条件評価を実装 ([8ac1e5c](https://github.com/r74tech/wdpr/commit/8ac1e5c))

### 🩹 Fixes

- **sec:** embed-block の ReDoS 脆弱性を修正 ([8038ef2](https://github.com/r74tech/wdpr/commit/8038ef2))
- **sec:** embed-block の src 属性検証を強化 ([24f05df](https://github.com/r74tech/wdpr/commit/24f05df))
- **sec:** medium セキュリティ issue の修正 ([96e766d](https://github.com/r74tech/wdpr/commit/96e766d))
- **sec:** セキュリティ脆弱性の修正 ([bb4a7b4](https://github.com/r74tech/wdpr/commit/bb4a7b4))
- medium バグ issue の修正 + DOMPurify 設定改善 ([66e9c67](https://github.com/r74tech/wdpr/commit/66e9c67))
- Element 型の型絞り込みを修正 ([197369c](https://github.com/r74tech/wdpr/commit/197369c))
- user 要素のパースとレンダリングを修正 ([f6e74cd](https://github.com/r74tech/wdpr/commit/f6e74cd))
- 未解決の include にエラーメッセージを出力 ([387cf1d](https://github.com/r74tech/wdpr/commit/387cf1d))
- ブロックリストの Wikidot 互換性を向上 ([c7403c0](https://github.com/r74tech/wdpr/commit/c7403c0))
- トリプルブラケットリンクとページリンクレンダリングの改善 ([d83aa6d](https://github.com/r74tech/wdpr/commit/d83aa6d))
- リンクの rel 属性削除 ([7fea04a](https://github.com/r74tech/wdpr/commit/7fea04a))
- image 構文の Wikidot 互換性を向上 ([c1dbe68](https://github.com/r74tech/wdpr/commit/c1dbe68))
- html 要素のパース・レンダリング修正 ([a406bd6](https://github.com/r74tech/wdpr/commit/a406bd6))
- raw 構文の Wikidot 互換性を向上 ([0de5c67](https://github.com/r74tech/wdpr/commit/0de5c67))

## 0.1.0 (2026-01-31)

初期リリース。Wikidot マークアップの AST から HTML への変換を提供。
