## 1.4.0 (2026-09-12)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正 ([#75](https://github.com/r74tech/wdpr/pull/75))

### 🧱 Updated Dependencies

- Updated @wdprlib/decompiler to 1.5.0
- Updated @wdprlib/parser to 5.4.0
- Updated @wdprlib/render to 4.3.0
- Updated @wdprlib/ast to 4.3.0

### ❤️ Thank You

- r74tech @r74tech

## 1.3.0 (2026-09-09)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正し、i18nとビルド情報を追加する ([#73](https://github.com/r74tech/wdpr/pull/73))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.3 (2026-09-02)

### 🩹 Fixes

- **runtime:** ギャラリー画像をgrid列幅に収める ([#70](https://github.com/r74tech/wdpr/pull/70))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.2 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### 🔥 Performance

- **render:** 長文レンダリングの二重HTML生成を省く ([#65](https://github.com/r74tech/wdpr/pull/65))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.1 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.0 (2026-08-10)

### 🚀 Features

- 高レベルpipelineとadapter利用性を改善 ([#58](https://github.com/r74tech/wdpr/pull/58))

### ❤️ Thank You

- r74tech @r74tech

## 1.1.0 (2026-07-22)

### 🚀 Features

- add [[gallery]] syntax support ([#55](https://github.com/r74tech/wdpr/pull/55))
- **parser/ast:** opener-embedded [[#if]] / [[#expr]] / [[#ifexpr]] と [[iftags]] bare prefix 対応 ([#50](https://github.com/r74tech/wdpr/pull/50))

### ❤️ Thank You

- r74tech @r74tech

## 1.0.3 (2026-06-04)

### 🩹 Fixes

- **runtime:** 狭い viewport で footnote tooltip がはみ出る問題を修正 ([#39](https://github.com/r74tech/wdpr/pull/39))

### ❤️ Thank You

- r74tech @r74tech

## 1.0.2 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

# Changelog

## 1.0.1 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

初期リリース。

### 🚀 Features

- math 要素のレンダリングを MathML + SVG ポリフィル方式に変更 ([1970d03](https://github.com/r74tech/wdpr/commit/1970d03))
