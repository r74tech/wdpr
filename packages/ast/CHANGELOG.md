## 1.2.1 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.0 (2026-02-12)

### 🚀 Features

- ⚠️ **parser:** パーサーに診断(diagnostics)機能を追加 ([#23](https://github.com/r74tech/wdpr/pull/23))

### ⚠️ Breaking Changes

- **parser:** パーサーに診断(diagnostics)機能を追加 ([#23](https://github.com/r74tech/wdpr/pull/23))
  parse()がSyntaxTreeではなくParseResult { ast, diagnostics }を返すように変更。
  ParseContextにdiagnostics配列を追加。
  - refactor: parse()の戻り値変更に伴う呼び出し元を更新
    テストファイルにparseAst()ヘルパーを追加し、parse().astでSyntaxTreeを取得するように変更。
    wdmock-cfのpipeline.tsでもparse().astを使用し、resolveModulesのコールバックをラップ。
  - feat(parser): 閉じタグ不足とインラインブロックの診断を追加
    div, collapsible, tabview/tab, align, iftagsの各ブロックルールに
    閉じタグ不足のwarning診断を追加。
    consumeFailedDivにインラインブロック要素のerror診断を追加。
    メッセージは英語で統一し、codeフィールドでi18n対応可能。
  - feat(parser): code/math/html/embed/moduleブロックの閉じタグ診断を追加
  - feat(parser): span/sizeのインライン要素に閉じタグ診断を追加
  - feat(parser): list/table/anchor/footnote/bibliography/commentの診断を追加
  - test(parser): anchor/footnote/bibliography/commentの診断テストを追加
  - test(parser): tabview/tab/table/list/embed診断のテストを追加
    tabviewルールのEOFハンドリングバグも修正
  - test(parser): fail+diagnostic パスのテストを追加
    orphan-li、リスト内li閉じ忘れ、左寄せalignのunclosedテストを追加
  - test(parser): fixtureテストにdiagnostics検証を追加
    expected-diagnostics.jsonがあるfail fixtureのdiagnosticsを検証する仕組みを追加
  - feat(parser): divのoutside-inマッチングをbudgetシステムで実装
    Wikidotのdivブロックは外側から内側へペアリングされる。
    opens > closesの場合、最も内側の余剰openはテキスト化される。
  * ParseContextにdivClosesBudgetフィールドを追加
  * budget=0でdivルールがfail→テキストにフォールバック
  * countDivCloses()で残りclose数を計算
  * consumeFailedDivのスキャンを改善: valid divブロック開始時に停止
  * 吸収範囲内の追加[[div]]パターンにinline-block-element diagnostic発行
  - feat(parser): div隣接paragraphの<p>抑制をpost-processingで実装
    Wikidotではdivブロックに直接隣接するparagraphの<p>ラッピングが
    抑制される。間に他のブロック要素がある場合は<p>を維持する。
  * suppressDivAdjacentParagraphs()をpostprocessモジュールに追加
  * トップレベルでのみ適用（div内部のparagraphは維持）
  * div後に続くunwrapped contentにはline-breakを先頭に付与
  - test(parser): div/fail fixtureとdiagnosticsテストを更新
  * expected.json: budget systemと<p>抑制を反映したAST
  * expected-diagnostics.json: case 1/2両方のinline-block-element
  * diagnostics.test.ts: budget systemの動作に合わせてテストを修正
    - 余剰openはunclosed-blockではなくテキスト化される
  - fix(parser): blockCommentルールのunclosed-comment diagnostic重複を修正
    blockCommentがsuccess:falseを返すとparagraph fallback経由で
    inlineCommentが同じdiagnosticを発行していた。
    block側のdiagnostic pushを除去し、inline側に一元化。

### ❤️ Thank You

- r74tech @r74tech

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
