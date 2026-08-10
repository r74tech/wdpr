# 4.0.0 (2026-08-10)

### 🩹 Fixes

- Securityレポートで検出された脆弱性の修正 ([#57](https://github.com/r74tech/wdpr/pull/57))

### ❤️ Thank You

- r74tech @r74tech

## Unreleased

### ⚠️ Breaking Changes

- `createSettings("page")` and `DEFAULT_SETTINGS` now set `allowStyleElements: false`. Callers that
  render trusted `[[module CSS]]` content must explicitly opt in with `allowStyleElements: true`.

## 2.4.0 (2026-07-24)

### 🚀 Features

- add high-level wikitext processing and rendering pipeline APIs ([#56](https://github.com/r74tech/wdpr/pull/56))

### ❤️ Thank You

- r74tech @r74tech

## 2.3.0 (2026-07-22)

### 🚀 Features

- add [[gallery]] syntax support ([#55](https://github.com/r74tech/wdpr/pull/55))

### ❤️ Thank You

- r74tech @r74tech

## 2.2.0 (2026-07-22)

### 🚀 Features

- **parser:** add TagCloud module support ([#54](https://github.com/r74tech/wdpr/pull/54))

### ❤️ Thank You

- r74tech @r74tech

## 2.1.0 (2026-06-10)

### 🚀 Features

- **parser/ast:** opener-embedded [[#if]] / [[#expr]] / [[#ifexpr]] と [[iftags]] bare prefix 対応 ([#50](https://github.com/r74tech/wdpr/pull/50))

### ❤️ Thank You

- r74tech @r74tech

# 2.0.0 (2026-06-04)

### 🚀 Features

- ⚠️  **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に ([#46](https://github.com/r74tech/wdpr/pull/46))

### ⚠️  Breaking Changes

- **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に  ([#46](https://github.com/r74tech/wdpr/pull/46))
  WikitextSettings に必須プロパティ allowHtmlBlocks が
  追加された。手書きで WikitextSettings を構築している消費者は
  allowHtmlBlocks フィールドの追加が必要。createSettings(mode) を経由
  していれば影響なし。
  * feat(parser)!: allowHtmlBlocks=false で [[html]] を黙って消費
  opener の `]]` を検証してから settings.allowHtmlBlocks === false を判定。
  disabled 時はブロック全体を消費して空要素 (success:true / elements:[]) を
  返し、ctx.htmlBlocks には push しない。close が見つからない場合も EOF まで
  消費して同じく空要素を返す (unclosed-block warning + html-block-disabled
  info の両方を emit)。中身が text として漏れない。
  malformed opener (closing `]]` 欠落) は従来どおり success:false で
  fallback する。enabled 時の挙動は完全維持。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では [[html]] が AST にも html-blocks 配列にも出ない。
  * feat(render)!: allowHtmlBlocks=false で html element を出力しない
  renderHtmlBlock の先頭で ctx.settings.allowHtmlBlocks === false を判定し
  早期 return。nextHtmlBlockIndex() の counter advance や htmlBlockUrl
  resolver 呼び出しより前に置くことで、disabled-but-still-in-AST な
  ブロック (手組み AST、キャッシュ AST、別 parser 由来) でも何も出力しない。
  これによりパース側で settings ゲートが効かないパス (例: 手組み AST の
  直接 render) でも enforcement boundary が保てる。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では html element をレンダしない (空)。
  * test: allowHtmlBlocks の parser/render 両側のテスト追加
  parser (tests/unit/parser/settings.test.ts):
  - createSettings 既定値 (page=true / draft, forum-post, direct-message=false)
  - enabled (page): [[html]] が html element になり html-blocks に push される
  - disabled (draft): element 出ず html-blocks 空、html-block-disabled diagnostic、本文に漏れない
  - disabled + unclosed: EOF まで consume、unclosed-block + html-block-disabled 両方 emit、漏れない
  - disabled + 周囲非干渉: 前後の paragraph は残る
  - forum-post / direct-message でも disabled になる
  render (tests/unit/render/settings.test.ts):
  - enabled: iframe が出る
  - disabled: 手組み AST に html element があっても iframe 出ない (enforcement boundary)
  - disabled: htmlBlockUrl resolver が呼ばれない
  * fix(parser): allowHtmlBlocks=false での leak と close-detection を強化
  3 件の漏れ・誤検出を修正:
  1. (High) close-detection の修正
     parseBlockName で名前が "html" と一致した時点で foundClose=true に
     していたため、malformed `[[/html no-close` (BLOCK_CLOSE 欠落) で close
     と誤認識し、後続テキストが leak する可能性があった。BLOCK_CLOSE まで
     reach できることを確認してから close と認める実装に変更 (whitespace は
     許容)。これにより disabled 時の unclosed パスも常に EOF まで consume
     する。
  2. (Medium) text-level の [[html]] strip pre-pass を追加
     block-rule の gate だけでは段落内 `before [[html]]X[[/html]] after`
     のような inline-position occurrence を捕まえられない (block dispatcher
     が mid-paragraph トークンに到達しない)。Wikidot 互換の非貪欲 regex で
     parse 開始時に text-level で strip し、両ポジションで漏れない設計に変更。
     parse() に `stripDisabledHtmlBlocks` を追加。
  3. (Low) disabled 時の contents 累積をスキップ
     disabled では body を破棄するため、token.value を contents に積む処理
     をガード。大きな入力でのメモリ/CPU を節約。
  test: 段落内 inline 漏れ防止 + malformed close 漏れ防止 のケースを追加。
  * refactor(parser): allowHtmlBlocks gate を inline rule で実装 (text-level pre-pass 廃止)
  text-level pre-pass の問題点を洗い直して再設計:
  1. (High) Parser class 直接使用で pre-pass がバイパスされる
  2. (High) closed のみ strip、mid-paragraph unclosed が漏れる
  3. (Medium) text-level pre-pass が [[code]]/[[html]] 等 raw 内も削除
  4. (Medium) strip 後の lex で diagnostic 位置がずれる
  5. (Medium) pre-pass の gate が truthiness、rule/render は === false
  → text-level pre-pass を廃止し、inline html rule 追加で再設計:
  - packages/parser/src/parser/preprocess/strip-disabled-html.ts 削除
  - parse() を元に戻す
  - packages/parser/src/parser/rules/inline/html.ts (新規 htmlInlineRule):
    - allowHtmlBlocks !== false: success:false (従来挙動維持)
    - === false: [[html]]...[[/html]] を inline で消費、空要素返す
    - close-detection は BLOCK_CLOSE まで verify (whitespace 許容)
    - unclosed: NEWLINE+NEWLINE (blank line) で停止 (後続 paragraph 保護)
  - block rule にも同じ blank-line 停止を追加
  - inline rules 配列に登録 (commentRule の直後)
  これで5件すべて解消:
  1. rule 自体が parse 時に走るので Parser 直接使用でも gate される
  2. inline rule が mid-paragraph closed/unclosed 両方扱う
  3. [[code]]/[[html]] 内は block rule で raw 扱いされ inline rule は到達しない
  4. source mutation なしで位置情報そのまま
  5. すべて === false に統一
  test 追加: Parser 直接使用 / blank-line で stop / code 内 [[html]] 保護
  * fix(parser): enabled html block の空行誤認 + close 末尾 whitespace 漏れを修正
  2 件のバグを修正:
  1. (High) blank-line stop が enabled でも効き、空行を含む valid [[html]]
     block が page mode で壊れる。例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]
     → blank-line stop を disabled 時のみに限定。
  2. (Medium) close detection は [[/html ]] (whitespace before ]]) を
     許容するが、close 消費側が whitespace を skip しておらず ]] が paragraph
     text に漏れていた。close 消費側にも whitespace skip を追加。
  test: 空行入り valid html block / whitespace 付き close tag のケース追加。
  * fix(parser): disabled でも closed [[html]] の body 内空行で漏れていた問題を修正
  disabled mode で blank-line stop が close より先に発火し、空行を含む
  closed [[html]] (例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]) の
  後半 <p>two</p> と [[/html]] が paragraph text に漏れていた。
  修正: 事前の forward lookahead で real close 存在を確認する
  lookaheadHasHtmlClose ヘルパを追加し、close が ahead に存在する場合は
  blank-line stop を抑止。close 不在 (truly unclosed) の時のみ blank-line
  stop が効く。block rule / inline rule 両方に適用。
  regression test: disabled mode で空行入り closed block が完全に消費される
  ことを確認。

### ❤️ Thank You

- r74tech @r74tech

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
