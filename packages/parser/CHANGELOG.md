# Changelog

## 1.1.0 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

### 🚀 Features

- bibliography/bibcite 構文を実装 ([d837dd6](https://github.com/r74tech/wdpr/commit/d837dd6))
- math 要素のレンダリングを MathML + SVG ポリフィル方式に変更 ([1970d03](https://github.com/r74tech/wdpr/commit/1970d03))
- [[embed]] ブロックを実装 ([dc4b585](https://github.com/r74tech/wdpr/commit/dc4b585))

### 🩹 Fixes

- cleanInternalFlags で list/definition-list/line-break 要素を再帰処理 ([3fc120a](https://github.com/r74tech/wdpr/commit/3fc120a))
- テーブルセル内のパースを修正 ([6bfcdcd](https://github.com/r74tech/wdpr/commit/6bfcdcd))
- 明示的な line-break（バックスラッシュ/アンダースコア）を段落末尾で保持 ([32776eb](https://github.com/r74tech/wdpr/commit/32776eb))
- user 要素のパースとレンダリングを修正 ([f6e74cd](https://github.com/r74tech/wdpr/commit/f6e74cd))
- Element 型の型絞り込みを修正 ([197369c](https://github.com/r74tech/wdpr/commit/197369c))
- ul/ol 外の [[li]] をテキストとして処理 ([da9e921](https://github.com/r74tech/wdpr/commit/da9e921))
- ブロックリストの Wikidot 互換性を向上 ([c7403c0](https://github.com/r74tech/wdpr/commit/c7403c0))
- 改行を含むトリプルブラケットリンクのサポート ([b8bbf72](https://github.com/r74tech/wdpr/commit/b8bbf72))
- トリプルブラケットリンクとページリンクレンダリングの改善 ([d83aa6d](https://github.com/r74tech/wdpr/commit/d83aa6d))
- backslash line-break 処理の修正 ([685fb5d](https://github.com/r74tech/wdpr/commit/685fb5d))
- image 構文の Wikidot 互換性を向上 ([c1dbe68](https://github.com/r74tech/wdpr/commit/c1dbe68))
- html 要素のパース・レンダリング修正 ([a406bd6](https://github.com/r74tech/wdpr/commit/a406bd6))
- iframe の XSS 脆弱性対策と attribute フィルタリング追加 ([f577489](https://github.com/r74tech/wdpr/commit/f577489))
- raw 構文の Wikidot 互換性を向上 ([0de5c67](https://github.com/r74tech/wdpr/commit/0de5c67))
- span_ の paragraph unwrap 処理を修正 ([e5e454c](https://github.com/r74tech/wdpr/commit/e5e454c))
- size パーサーのサポート単位を制限 ([caaa1bd](https://github.com/r74tech/wdpr/commit/caaa1bd))
- 空の subscript を無視するよう修正 ([223d18c](https://github.com/r74tech/wdpr/commit/223d18c))
- 空の superscript を無視するよう修正 ([4acaacc](https://github.com/r74tech/wdpr/commit/4acaacc))
- 空の underline（____）を破棄するよう修正 ([9373fe1](https://github.com/r74tech/wdpr/commit/9373fe1))
- 空の bold(****) を Wikidot 互換で破棄するよう修正 ([1c6a337](https://github.com/r74tech/wdpr/commit/1c6a337))
- 空のカラー指定 (##|text##) をテキストとして扱う ([e220110](https://github.com/r74tech/wdpr/commit/e220110))
- [[ の直後にスペースがある場合はブロック構文として認識しない ([060ba6d](https://github.com/r74tech/wdpr/commit/060ba6d))
- definition-list 直前のテキストを paragraph に包まない ([45a9a5b](https://github.com/r74tech/wdpr/commit/45a9a5b))
- blockquote パーサーを Wikidot 互換に修正 ([b8fa4fe](https://github.com/r74tech/wdpr/commit/b8fa4fe))
- heading の 7+ マーカー拒否・無効 heading 前の line-break 生成 ([cdc804c](https://github.com/r74tech/wdpr/commit/cdc804c))
- align ブロック前の改行が line-break にならない問題を修正 ([77a43aa](https://github.com/r74tech/wdpr/commit/77a43aa))

## 0.1.0 (2026-01-31)

初期リリース。Wikidot マークアップの字句解析（Lexer）と構文解析（Parser）を提供。
