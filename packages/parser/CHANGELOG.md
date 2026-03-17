## 2.1.0 (2026-03-17)

### 🚀 Features

- ⚠️ resolveIncludesAsync追加 & include処理をWikidot互換イテレーティブ方式に書き換え ([#36](https://github.com/r74tech/wdpr/pull/36))

### ⚠️ Breaking Changes

- resolveIncludesAsync追加 & include処理をWikidot互換イテレーティブ方式に書き換え ([#36](https://github.com/r74tech/wdpr/pull/36))
  maxDepthオプション削除、循環includeのエラー文言廃止

### ❤️ Thank You

- r74tech @r74tech

## 2.0.10 (2026-03-15)

### 🩹 Fixes

- [[collapsible]]内で段落分けされない問題を修正 ([#35](https://github.com/r74tech/wdpr/pull/35), [#33](https://github.com/r74tech/wdpr/issues/33))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.9 (2026-02-22)

### 🩹 Fixes

- [[iframe]]のclass/align属性がパースされない問題を修正 ([#32](https://github.com/r74tech/wdpr/pull/32))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.8 (2026-02-21)

### 🩹 Fixes

- QUOTED_STRINGがインラインのリンク構文を飲み込む問題を修正 ([#31](https://github.com/r74tech/wdpr/pull/31))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.7 (2026-02-21)

### 🩹 Fixes

- QUOTED_STRINGがインラインのリンク構文を飲み込む問題を修正 ([#31](https://github.com/r74tech/wdpr/pull/31))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.6 (2026-02-21)

### 🩹 Fixes

- トリプルブラケットリンクの\*prefixがpipe付きで機能しない問題を修正 ([#30](https://github.com/r74tech/wdpr/pull/30))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.4 (2026-02-21)

### 🩹 Fixes

- includeの行頭限定とembed iframeのstyle/class属性保持 ([#29](https://github.com/r74tech/wdpr/pull/29))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.3 (2026-02-21)

### 🩹 Fixes

- パイプテーブルセル内の改行継続をサポート ([#27](https://github.com/r74tech/wdpr/pull/27), [#28](https://github.com/r74tech/wdpr/pull/28))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.2 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

## 2.0.1 (2026-02-17)

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

# 2.0.0 (2026-02-12)

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

## 1.1.5 (2026-02-12)

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

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.2.0

### ❤️ Thank You

- r74tech @r74tech

## 1.1.4 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### ❤️ Thank You

- r74tech @r74tech

## 1.1.3 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.1.1

### ❤️ Thank You

- r74tech @r74tech

## 1.1.2 (2026-02-08)

### 🩹 Fixes

- **parser:** パーサーのminor bug 4件を修正 ([#20](https://github.com/r74tech/wdpr/pull/20))

### ❤️ Thank You

- r74tech @r74tech

## 1.1.1 (2026-02-08)

### 🩹 Fixes

- パーサー・レンダラーの軽微なバグ4件を修正 ([#18](https://github.com/r74tech/wdpr/pull/18), [#7](https://github.com/r74tech/wdpr/issues/7))
- polynomial ReDoSの正規表現パターンを修正 ([#15](https://github.com/r74tech/wdpr/pull/15), [#20](https://github.com/r74tech/wdpr/issues/20), [#23](https://github.com/r74tech/wdpr/issues/23), [#24](https://github.com/r74tech/wdpr/issues/24))

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
- span\_ の paragraph unwrap 処理を修正 ([e5e454c](https://github.com/r74tech/wdpr/commit/e5e454c))
- size パーサーのサポート単位を制限 ([caaa1bd](https://github.com/r74tech/wdpr/commit/caaa1bd))
- 空の subscript を無視するよう修正 ([223d18c](https://github.com/r74tech/wdpr/commit/223d18c))
- 空の superscript を無視するよう修正 ([4acaacc](https://github.com/r74tech/wdpr/commit/4acaacc))
- 空の underline（\_\_\_\_）を破棄するよう修正 ([9373fe1](https://github.com/r74tech/wdpr/commit/9373fe1))
- 空の bold(\*\*\*\*) を Wikidot 互換で破棄するよう修正 ([1c6a337](https://github.com/r74tech/wdpr/commit/1c6a337))
- 空のカラー指定 (##|text##) をテキストとして扱う ([e220110](https://github.com/r74tech/wdpr/commit/e220110))
- [[ の直後にスペースがある場合はブロック構文として認識しない ([060ba6d](https://github.com/r74tech/wdpr/commit/060ba6d))
- definition-list 直前のテキストを paragraph に包まない ([45a9a5b](https://github.com/r74tech/wdpr/commit/45a9a5b))
- blockquote パーサーを Wikidot 互換に修正 ([b8fa4fe](https://github.com/r74tech/wdpr/commit/b8fa4fe))
- heading の 7+ マーカー拒否・無効 heading 前の line-break 生成 ([cdc804c](https://github.com/r74tech/wdpr/commit/cdc804c))
- align ブロック前の改行が line-break にならない問題を修正 ([77a43aa](https://github.com/r74tech/wdpr/commit/77a43aa))

## 0.1.0 (2026-01-31)

初期リリース。Wikidot マークアップの字句解析（Lexer）と構文解析（Parser）を提供。
